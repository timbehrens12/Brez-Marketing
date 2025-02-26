import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { connectionId } = await request.json()
    
    if (!connectionId) {
      return NextResponse.json({ error: 'Missing connectionId' }, { status: 400 })
    }

    // Get connection details
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('id', connectionId)
      .single()

    if (connectionError || !connection) {
      console.error('Error fetching connection:', connectionError)
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
    }

    // Validate connection data
    if (!connection.access_token || !connection.shop) {
      return NextResponse.json({ 
        error: 'Invalid connection: missing access token or shop' 
      }, { status: 400 })
    }

    // Update sync status to in_progress
    await supabase
      .from('platform_connections')
      .update({ sync_status: 'in_progress' })
      .eq('id', connectionId)

    // Start sync process
    let totalOrders = 0
    let nextCursor = null

    do {
      try {
        // Build the URL with cursor-based pagination
        let url = `https://${connection.shop}/admin/api/2024-01/orders.json?limit=250&status=any&fields=id,created_at,total_price,customer,line_items`
        if (nextCursor) {
          url += `&page_info=${nextCursor}`
        }

        const response = await fetch(url, {
          headers: {
            'X-Shopify-Access-Token': connection.access_token,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error('Shopify API error response:', errorText)
          throw new Error(`Shopify API error: ${response.statusText} - ${errorText}`)
        }

        // Get the next page cursor from the Link header
        const linkHeader = response.headers.get('Link')
        nextCursor = null
        if (linkHeader) {
          const match = linkHeader.match(/<[^>]*page_info=([^>&"]*)[^>]*>; rel="next"/)
          if (match) {
            nextCursor = match[1]
          }
        }

        const data = await response.json()
        const orders = data.orders

        if (!orders?.length) {
          break
        }

        // Format orders for database
        const formattedOrders = orders.map(order => ({
          id: order.id.toString(),
          connection_id: connectionId,
          created_at: order.created_at,
          total_price: order.total_price,
          customer_id: order.customer?.id?.toString(),
          line_items: order.line_items
        }))

        // Batch insert orders
        const { error: insertError } = await supabase
          .from('shopify_orders')
          .upsert(formattedOrders, {
            onConflict: 'id',
            ignoreDuplicates: true
          })

        if (insertError) throw insertError

        totalOrders += orders.length

        // Respect API rate limits
        await new Promise(resolve => setTimeout(resolve, 500))
      } catch (error) {
        console.error('Error during sync:', error)
        throw error
      }
    } while (nextCursor)

    // Update sync status to completed
    await supabase
      .from('platform_connections')
      .update({ 
        sync_status: 'completed',
        last_synced_at: new Date().toISOString()
      })
      .eq('id', connectionId)

    return NextResponse.json({ success: true, totalOrders })

  } catch (error) {
    console.error('Sync error:', error)
    
    // Update sync status to failed
    if (request.body?.connectionId) {
      await supabase
        .from('platform_connections')
        .update({ sync_status: 'failed' })
        .eq('id', request.body.connectionId)
    }

    return NextResponse.json({ 
      error: 'Sync failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 