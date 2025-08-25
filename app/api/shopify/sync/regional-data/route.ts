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

    console.log(`[Regional Sync] Starting regional data sync for brand ${brandId}`)

    // Re-fetch recent orders from Shopify to get address data
    const shop = connection.shop
    const accessToken = connection.access_token

    if (!accessToken) {
      return NextResponse.json({ error: 'No access token found' }, { status: 400 })
    }

    // Fetch orders from Shopify API
    const ordersUrl = `https://${shop}/admin/api/2024-01/orders.json?status=any&limit=250`
    
    const response = await fetch(ordersUrl, {
      headers: { 'X-Shopify-Access-Token': accessToken }
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json({ error: `Shopify API error: ${response.status} - ${errorText}` }, { status: 500 })
    }

    const data = await response.json()
    const orders = data.orders || []

    console.log(`[Regional Sync] Found ${orders.length} orders from Shopify`)

    let processedCount = 0
    let addressFoundCount = 0

    for (const order of orders) {
      try {
        // Extract address data
        const shippingAddress = order.shipping_address || {}
        const billingAddress = order.billing_address || {}
        const customerDefaultAddress = order.customer?.default_address || {}
        
        // Use shipping address if available, otherwise try billing address, then customer default address
        const address = shippingAddress.city ? shippingAddress : 
                       billingAddress.city ? billingAddress : 
                       customerDefaultAddress.city ? customerDefaultAddress : null
        
        if (address && address.city) {
          console.log(`[Regional Sync] 📍 Processing address for order ${order.id}: ${address.city}, ${address.country}`)
          
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
          
          if (regionError) {
            console.error(`[Regional Sync] ⚠️ Error storing regional data for order ${order.id}:`, regionError)
          } else {
            addressFoundCount++
            console.log(`[Regional Sync] ✅ Stored regional data for order ${order.id}`)
          }
        } else {
          console.log(`[Regional Sync] ⚠️ No address found for order ${order.id}`)
        }

        processedCount++
      } catch (orderError) {
        console.error(`[Regional Sync] ❌ Error processing order ${order.id}:`, orderError)
      }
    }

    console.log(`[Regional Sync] Complete! Processed: ${processedCount}, With addresses: ${addressFoundCount}`)

    return NextResponse.json({ 
      success: true, 
      message: `Regional data sync completed. Processed ${processedCount} orders, found addresses for ${addressFoundCount} orders.`,
      stats: {
        totalOrders: processedCount,
        ordersWithAddresses: addressFoundCount
      }
    })

  } catch (error) {
    console.error('Regional data sync API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
