import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { connectionId } = await request.json()

  try {
    // Get connection details
    const { data: connection } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('id', connectionId)
      .single()

    if (!connection?.access_token || !connection.shop) {
      throw new Error('Invalid connection')
    }

    console.log('Starting sync for shop:', connection.shop)
    let hasMore = true
    let page = 1
    let totalOrders = 0

    while (hasMore) {
      // Fetch orders from Shopify with pagination
      const response = await fetch(
        `https://${connection.shop}/admin/api/2024-01/orders.json?limit=250&page=${page}&status=any`, {
          headers: {
            'X-Shopify-Access-Token': connection.access_token
          }
        }
      )

      if (!response.ok) {
        throw new Error(`Shopify API error: ${response.statusText}`)
      }

      const { orders } = await response.json()
      
      if (!orders.length) {
        hasMore = false
        continue
      }

      // Prepare orders for bulk insert
      const formattedOrders = orders.map(order => ({
        id: order.id,
        created_at: order.created_at,
        total_price: order.total_price,
        customer_id: order.customer?.id,
        line_items: order.line_items,
        connection_id: connectionId
      }))

      // Bulk insert orders
      const { error } = await supabase
        .from('shopify_orders')
        .upsert(formattedOrders, { 
          onConflict: 'id',
          ignoreDuplicates: true 
        })

      if (error) throw error

      totalOrders += orders.length
      console.log(`Synced ${orders.length} orders (page ${page})`)
      page++

      // Respect Shopify's API rate limits
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    // Update connection status
    await supabase
      .from('platform_connections')
      .update({ 
        last_synced_at: new Date().toISOString(),
        sync_status: 'completed'
      })
      .eq('id', connectionId)

    console.log(`Sync completed. Total orders: ${totalOrders}`)
    return NextResponse.json({ success: true, totalOrders })

  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 })
  }
} 