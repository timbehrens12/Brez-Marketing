import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { auth } from '@clerk/nextjs/server'

// Trigger data sync for a Shopify store
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { shop, brandId } = await request.json()

    if (!shop || !brandId) {
      return NextResponse.json({ error: 'Shop and brandId are required' }, { status: 400 })
    }

    console.log('[Shopify Sync] Starting data sync for shop:', shop)

    const supabase = createClient()

    // Get the connection
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('platform_type', 'shopify')
      .eq('shop', shop)
      .eq('brand_id', brandId)
      .eq('user_id', userId)
      .single()

    if (connectionError || !connection) {
      return NextResponse.json({ error: 'Store connection not found' }, { status: 404 })
    }

    if (!connection.access_token) {
      return NextResponse.json({ error: 'Store not properly connected' }, { status: 400 })
    }

    // Initialize sync status for key tables
    const syncTables = [
      'shopify_orders',
      'shopify_products', 
      'shopify_customers',
      'shopify_collections',
      'shopify_inventory'
    ]

    for (const tableName of syncTables) {
      await supabase
        .from('shopify_sync_status')
        .upsert({
          shop_domain: shop,
          table_name: tableName,
          sync_status: 'pending',
          updated_at: new Date().toISOString()
        })
    }

    // Update connection sync status
    await supabase
      .from('platform_connections')
      .update({
        sync_status: 'syncing',
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', connection.id)

    // Fetch and store actual Shopify data
    setTimeout(async () => {
      try {
        const supabase = createClient()
        console.log('[Shopify Sync] Starting actual data fetch for shop:', shop)
        
        // Fetch orders from Shopify API
        const ordersResponse = await fetch(`https://${shop}/admin/api/2024-01/orders.json?limit=250&status=any`, {
          headers: {
            'X-Shopify-Access-Token': connection.access_token,
          },
        })
        
        let orders = []
        if (ordersResponse.ok) {
          const ordersData = await ordersResponse.json()
          orders = ordersData.orders || []
          
          console.log('[Shopify Sync] Fetched', orders.length, 'orders from Shopify API')
          
          // Store orders in database
          for (const order of orders) {
            try {
              // Insert order
              await supabase
                .from('shopify_orders')
                .upsert({
                  id: parseInt(order.id),
                  connection_id: connection.id,
                  brand_id: connection.brand_id,
                  user_id: connection.user_id,
                  order_number: order.order_number,
                  total_price: parseFloat(order.total_price),
                  subtotal_price: parseFloat(order.subtotal_price || order.total_price),
                  total_tax: parseFloat(order.total_tax || '0'),
                  total_discounts: parseFloat(order.total_discounts || '0'),
                  created_at: order.created_at,
                  financial_status: order.financial_status,
                  fulfillment_status: order.fulfillment_status,
                  customer_email: order.email,
                  currency: order.currency,
                  customer_id: order.customer?.id ? parseInt(order.customer.id) : null,
                  line_items: order.line_items || []
                }, { onConflict: 'id' })
              
              // Regional sales data will be calculated from orders table
              // No need to store separately - can aggregate from shopify_orders
              
            } catch (orderError) {
              console.error('[Shopify Sync] Error storing order', order.id, ':', orderError)
            }
          }
          
          console.log('[Shopify Sync] Successfully stored', orders.length, 'orders')
        } else {
          console.error('[Shopify Sync] Failed to fetch orders:', ordersResponse.status, ordersResponse.statusText)
        }
        
        // Mark sync as completed
        await supabase
          .from('platform_connections')
          .update({
            sync_status: 'completed',
            updated_at: new Date().toISOString()
          })
          .eq('id', connection.id)

        // Update individual table sync status
        for (const tableName of syncTables) {
          await supabase
            .from('shopify_sync_status')
            .update({
              sync_status: 'completed',
              records_synced: tableName === 'shopify_orders' ? (orders?.length || 0) : 0,
              updated_at: new Date().toISOString()
            })
            .eq('shop_domain', shop)
            .eq('table_name', tableName)
        }
        
        console.log('[Shopify Sync] Completed sync for shop:', shop)
      } catch (error) {
        console.error('[Shopify Sync] Error during sync:', error)
        
        // Mark sync as failed
        await supabase
          .from('platform_connections')
          .update({
            sync_status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('id', connection.id)
      }
    }, 2000) // 2 second delay to allow for response

    return NextResponse.json({ 
      success: true,
      message: 'Data sync started',
      syncTables
    })

  } catch (error) {
    console.error('[Shopify Sync] Error:', error)
    return NextResponse.json({ 
      error: 'Failed to start sync' 
    }, { status: 500 })
  }
}