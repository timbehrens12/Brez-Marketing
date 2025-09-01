import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { auth } from '@clerk/nextjs/server'

/**
 * HARD REFRESH - Immediately pulls ALL recent orders from Shopify
 * Bypasses webhooks, queues, and all other bullshit
 * This is the NUCLEAR OPTION for getting fresh data
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { brandId } = await request.json()
    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID required' }, { status: 400 })
    }

    console.log(`🔥 [HARD REFRESH] Starting nuclear sync for brand ${brandId}`)
    
    const supabase = createClient()

    // Get the active Shopify connection
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('platform_type', 'shopify')
      .eq('brand_id', brandId)
      .eq('status', 'active')
      .single()

    if (connectionError || !connection) {
      console.error('🔥 [HARD REFRESH] Connection not found:', connectionError)
      return NextResponse.json({ error: 'Shopify connection not found' }, { status: 404 })
    }

    if (!connection.access_token || !connection.shop) {
      return NextResponse.json({ error: 'Invalid connection credentials' }, { status: 400 })
    }

    console.log(`🔥 [HARD REFRESH] Pulling orders from ${connection.shop}`)

    // Pull ALL orders from the last 7 days (should catch everything recent)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    
    const shopifyUrl = `https://${connection.shop}/admin/api/2024-01/orders.json?limit=250&status=any&created_at_min=${sevenDaysAgo}&fields=id,order_number,total_price,subtotal_price,total_tax,total_discounts,created_at,updated_at,financial_status,fulfillment_status,customer,email,contact_email,currency,tags,note,line_items,shipping_address,billing_address`
    
    console.log(`🔥 [HARD REFRESH] Fetching from: ${shopifyUrl}`)

    const shopifyResponse = await fetch(shopifyUrl, {
      headers: {
        'X-Shopify-Access-Token': connection.access_token,
        'Content-Type': 'application/json'
      }
    })

    if (!shopifyResponse.ok) {
      const errorText = await shopifyResponse.text()
      console.error('🔥 [HARD REFRESH] Shopify API error:', errorText)
      return NextResponse.json({ 
        error: 'Failed to fetch from Shopify API',
        details: errorText,
        status: shopifyResponse.status
      }, { status: shopifyResponse.status })
    }

    const shopifyData = await shopifyResponse.json()
    console.log(`🔥 [HARD REFRESH] Retrieved ${shopifyData.orders?.length || 0} orders from Shopify`)

    if (!shopifyData.orders || shopifyData.orders.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No orders found in Shopify',
        ordersProcessed: 0,
        shopifyOrderCount: 0
      })
    }

    // Show what we got from Shopify
    console.log('🔥 [HARD REFRESH] Orders from Shopify:')
    shopifyData.orders.forEach((order: any, index: number) => {
      console.log(`  ${index + 1}. Order #${order.order_number}: $${order.total_price} at ${order.created_at}`)
    })

    // Process and upsert orders
    let processedCount = 0
    let newOrderCount = 0
    const errors = []

    for (const order of shopifyData.orders) {
      try {
        const orderData = {
          id: parseInt(order.id),
          brand_id: brandId,
          connection_id: connection.id,
          user_id: userId,
          order_number: order.order_number,
          total_price: parseFloat(order.total_price || '0'),
          subtotal_price: parseFloat(order.subtotal_price || '0'),
          total_tax: parseFloat(order.total_tax || '0'),
          total_discounts: parseFloat(order.total_discounts || '0'),
          created_at: order.created_at,
          updated_at: order.updated_at,
          financial_status: order.financial_status,
          fulfillment_status: order.fulfillment_status,
          customer_id: order.customer?.id ? parseInt(order.customer.id) : null,
          customer_email: order.email || order.contact_email || '',
          customer_first_name: order.customer?.first_name || '',
          customer_last_name: order.customer?.last_name || '',
          currency: order.currency || 'USD',
          tags: order.tags || '',
          note: order.note || '',
          line_items: order.line_items || []
        }

        // Check if this order already exists
        const { data: existingOrder } = await supabase
          .from('shopify_orders')
          .select('id')
          .eq('id', orderData.id)
          .single()

        const isNewOrder = !existingOrder

        const { error: upsertError } = await supabase
          .from('shopify_orders')
          .upsert([orderData], { 
            onConflict: 'id',
            ignoreDuplicates: false 
          })

        if (upsertError) {
          console.error(`🔥 [HARD REFRESH] Error upserting order ${order.id}:`, upsertError)
          errors.push(`Order ${order.id}: ${upsertError.message}`)
        } else {
          processedCount++
          if (isNewOrder) {
            newOrderCount++
            console.log(`🔥 [HARD REFRESH] 🆕 NEW ORDER #${order.order_number}: $${order.total_price}`)
          } else {
            console.log(`🔥 [HARD REFRESH] ✅ Updated order #${order.order_number}: $${order.total_price}`)
          }
        }

        // Also store regional data if available
        if (order.shipping_address || order.billing_address) {
          const address = order.shipping_address || order.billing_address
          if (address.city) {
            await supabase
              .from('shopify_sales_by_region')
              .upsert([{
                connection_id: connection.id,
                brand_id: brandId,
                user_id: userId,
                order_id: order.id.toString(),
                created_at: order.created_at,
                city: address.city,
                province: address.province,
                country: address.country,
                country_code: address.country_code,
                total_price: parseFloat(order.total_price || '0'),
                order_count: 1
              }], { 
                onConflict: 'connection_id,order_id',
                ignoreDuplicates: false 
              })
          }
        }

      } catch (orderError) {
        console.error(`🔥 [HARD REFRESH] Error processing order ${order.id}:`, orderError)
        errors.push(`Order ${order.id}: ${orderError instanceof Error ? orderError.message : 'Unknown error'}`)
      }
    }

    // Update connection sync timestamp
    await supabase
      .from('platform_connections')
      .update({
        last_synced_at: new Date().toISOString(),
        sync_status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', connection.id)

    console.log(`🔥 [HARD REFRESH] ✅ NUCLEAR SYNC COMPLETED!`)
    console.log(`🔥 [HARD REFRESH] - Processed: ${processedCount}/${shopifyData.orders.length} orders`)
    console.log(`🔥 [HARD REFRESH] - New orders: ${newOrderCount}`)
    console.log(`🔥 [HARD REFRESH] - Errors: ${errors.length}`)

    return NextResponse.json({
      success: true,
      message: 'Nuclear hard refresh completed',
      ordersProcessed: processedCount,
      newOrders: newOrderCount,
      totalOrdersFromShopify: shopifyData.orders.length,
      errors: errors.length > 0 ? errors : undefined,
      connection: {
        shop: connection.shop,
        last_synced: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('🔥 [HARD REFRESH] NUCLEAR ERROR:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Nuclear hard refresh failed'
    }, { status: 500 })
  }
}
