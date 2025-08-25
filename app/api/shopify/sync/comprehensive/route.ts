import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { auth } from '@clerk/nextjs/server'

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { brandId } = await request.json()

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    const supabase = createClient()

    // Get the connection for this brand
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('brand_id', brandId)
      .eq('platform_type', 'shopify')
      .eq('user_id', userId)
      .single()

    if (connectionError || !connection) {
      return NextResponse.json({ error: 'Shopify connection not found' }, { status: 404 })
    }

    const shop = connection.shop
    const accessToken = connection.access_token

    if (!accessToken) {
      return NextResponse.json({ error: 'No access token found' }, { status: 400 })
    }

    console.log(`[Comprehensive Sync] Starting full analytics sync for shop ${shop}`)

    const results = {
      orders: 0,
      regionalData: 0,
      abandonedCarts: 0,
      customers: 0,
      errors: [] as string[]
    }

    try {
      // 1. Sync orders with address data
      console.log(`[Comprehensive Sync] 1. Syncing orders with address data...`)
      
      const ordersUrl = `https://${shop}/admin/api/2024-01/orders.json?status=any&limit=250`
      const ordersResponse = await fetch(ordersUrl, {
        headers: { 'X-Shopify-Access-Token': accessToken }
      })

      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json()
        const orders = ordersData.orders || []
        
        for (const order of orders) {
          // Extract address data
          const shippingAddress = order.shipping_address || {}
          const billingAddress = order.billing_address || {}
          const customerDefaultAddress = order.customer?.default_address || {}
          
          const address = shippingAddress.city ? shippingAddress : 
                         billingAddress.city ? billingAddress : 
                         customerDefaultAddress.city ? customerDefaultAddress : null
          
          if (address && address.city) {
            const { error: regionError } = await supabase
              .from('shopify_sales_by_region')
              .upsert({
                connection_id: connection.id,
                brand_id: brandId,
                user_id: userId,
                order_id: order.id.toString(),
                created_at: order.created_at,
                city: address.city,
                province: address.province,
                province_code: address.province_code,
                country: address.country,
                country_code: address.country_code,
                total_price: parseFloat(order.total_price || '0'),
                order_count: 1
              }, { onConflict: 'connection_id,order_id' })
            
            if (!regionError) {
              results.regionalData++
            }
          }
        }
        results.orders = orders.length
      }

      // 2. Sync abandoned checkouts
      console.log(`[Comprehensive Sync] 2. Syncing abandoned checkouts...`)
      
      const abandonedUrl = `https://${shop}/admin/api/2024-01/checkouts.json?status=abandoned&limit=250`
      const abandonedResponse = await fetch(abandonedUrl, {
        headers: { 'X-Shopify-Access-Token': accessToken }
      })

      if (abandonedResponse.ok) {
        const abandonedData = await abandonedResponse.json()
        const checkouts = abandonedData.checkouts || []
        
        for (const checkout of checkouts) {
          const shippingAddress = checkout.shipping_address || {}
          const billingAddress = checkout.billing_address || {}
          const address = shippingAddress.city ? shippingAddress : 
                         billingAddress.city ? billingAddress : null

          const { error: checkoutError } = await supabase
            .from('shopify_abandoned_checkouts')
            .upsert({
              checkout_id: checkout.token,
              brand_id: brandId,
              connection_id: connection.id,
              user_id: userId,
              email: checkout.email,
              customer_id: checkout.customer_id ? parseInt(checkout.customer_id) : null,
              total_price: parseFloat(checkout.total_price || '0'),
              subtotal_price: parseFloat(checkout.subtotal_price || '0'),
              total_tax: parseFloat(checkout.total_tax || '0'),
              currency: checkout.currency,
              line_items: checkout.line_items || [],
              line_items_count: checkout.line_items?.length || 0,
              abandoned_checkout_url: checkout.abandoned_checkout_url,
              created_at: checkout.created_at,
              updated_at: checkout.updated_at,
              completed_at: checkout.completed_at,
              city: address?.city,
              province: address?.province,
              country: address?.country,
              country_code: address?.country_code,
              last_synced_at: new Date().toISOString()
            }, { onConflict: 'checkout_id,brand_id' })
          
          if (!checkoutError) {
            results.abandonedCarts++
          }
        }
      }

      // 3. Sync customer analytics
      console.log(`[Comprehensive Sync] 3. Syncing customer analytics...`)
      
      const customersUrl = `https://${shop}/admin/api/2024-01/customers.json?limit=250`
      const customersResponse = await fetch(customersUrl, {
        headers: { 'X-Shopify-Access-Token': accessToken }
      })

      if (customersResponse.ok) {
        const customersData = await customersResponse.json()
        const customers = customersData.customers || []
        
        for (const customer of customers) {
          const totalSpent = parseFloat(customer.total_spent || '0')
          const ordersCount = customer.orders_count || 0
          const avgOrderValue = ordersCount > 0 ? totalSpent / ordersCount : 0
          const defaultAddress = customer.default_address || {}

          const { error: customerError } = await supabase
            .from('shopify_customer_analytics')
            .upsert({
              customer_id: parseInt(customer.id),
              brand_id: brandId,
              connection_id: connection.id,
              user_id: userId,
              email: customer.email,
              first_name: customer.first_name,
              last_name: customer.last_name,
              phone: customer.phone,
              total_spent: totalSpent,
              orders_count: ordersCount,
              average_order_value: avgOrderValue,
              state: customer.state,
              tags: customer.tags,
              accepts_marketing: customer.accepts_marketing,
              accepts_marketing_updated_at: customer.accepts_marketing_updated_at,
              marketing_opt_in_level: customer.marketing_opt_in_level,
              created_at: customer.created_at,
              updated_at: customer.updated_at,
              last_order_id: customer.last_order_id,
              last_order_name: customer.last_order_name,
              currency: customer.currency,
              city: defaultAddress.city,
              province: defaultAddress.province,
              country: defaultAddress.country,
              country_code: defaultAddress.country_code,
              last_synced_at: new Date().toISOString()
            }, { onConflict: 'customer_id,brand_id' })
          
          if (!customerError) {
            results.customers++
          }
        }
      }

    } catch (syncError) {
      console.error('[Comprehensive Sync] Error during sync:', syncError)
      results.errors.push(syncError instanceof Error ? syncError.message : String(syncError))
    }

    console.log(`[Comprehensive Sync] Complete! Results:`, results)

    return NextResponse.json({ 
      success: true, 
      message: `Comprehensive sync completed successfully!`,
      results
    })

  } catch (error) {
    console.error('Comprehensive sync API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
