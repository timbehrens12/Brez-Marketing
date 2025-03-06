import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create a direct admin client that doesn't require authentication
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { connectionId } = body
    
    console.log('Shopify sync route hit:', { connectionId })
    
    if (!connectionId) {
      console.error('Missing connectionId')
      return NextResponse.json({ error: 'Missing connectionId' }, { status: 400 })
    }

    // Get connection details
    console.log('Fetching connection details')
    const { data: connection, error: connectionError } = await supabaseAdmin
      .from('platform_connections')
      .select('*')
      .eq('id', connectionId)
      .single()

    if (connectionError || !connection) {
      console.error('Error fetching connection:', connectionError)
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
    }

    console.log('Found connection:', {
      id: connection.id,
      platform_type: connection.platform_type,
      status: connection.status,
      shop: connection.shop
    })

    // Validate connection data
    if (!connection.access_token || !connection.shop) {
      console.error('Invalid connection:', {
        has_token: !!connection.access_token,
        has_shop: !!connection.shop
      })
      return NextResponse.json({ 
        error: 'Invalid connection: missing access token or shop' 
      }, { status: 400 })
    }

    // Update sync status to in_progress
    console.log('Updating sync status to in_progress')
    await supabaseAdmin
      .from('platform_connections')
      .update({ sync_status: 'in_progress' })
      .eq('id', connectionId)

    // Start sync process
    console.log('Starting sync process')
    let totalOrders = 0
    let nextCursor = null

    do {
      try {
        // Build the URL with cursor-based pagination
        let url = `https://${connection.shop}/admin/api/2023-04/orders.json?limit=250&status=any&fields=id,created_at,total_price,customer,line_items`
        if (nextCursor) {
          url += `&page_info=${nextCursor}`
        }

        console.log('Fetching orders from Shopify:', { url: url.substring(0, 100) + '...' })
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
          console.log('No orders found in this batch')
          break
        }

        console.log(`Found ${orders.length} orders in this batch`)

        // Format orders for database
        const formattedOrders = orders.map((order: any) => ({
          id: order.id.toString(),
          connection_id: connectionId,
          created_at: order.created_at,
          total_price: order.total_price,
          customer_id: order.customer?.id?.toString(),
          line_items: order.line_items
        }))

        // Batch insert orders
        console.log(`Inserting ${formattedOrders.length} orders into database`)
        const { error: insertError } = await supabaseAdmin
          .from('shopify_orders')
          .upsert(formattedOrders, {
            onConflict: 'id',
            ignoreDuplicates: true
          })

        if (insertError) {
          console.error('Error inserting orders:', insertError)
          throw insertError
        }

        totalOrders += orders.length
        console.log(`Total orders processed so far: ${totalOrders}`)

        // Respect API rate limits
        await new Promise(resolve => setTimeout(resolve, 500))
      } catch (error) {
        console.error('Error during sync:', error)
        throw error
      }
    } while (nextCursor)

    // Update sync status to completed
    console.log('Sync completed, updating status')
    await supabaseAdmin
      .from('platform_connections')
      .update({ 
        sync_status: 'completed',
        last_synced_at: new Date().toISOString()
      })
      .eq('id', connectionId)

    console.log('Sync process completed successfully')
    return NextResponse.json({ success: true, totalOrders })

  } catch (error) {
    console.error('Sync error:', error)
    
    // Update sync status to failed
    if (request.body) {
      try {
        const body = await request.json()
        if (body.connectionId) {
          console.log('Updating sync status to failed')
          await supabaseAdmin
            .from('platform_connections')
            .update({ sync_status: 'failed' })
            .eq('id', body.connectionId)
        }
      } catch (parseError) {
        console.error('Error parsing request body:', parseError)
      }
    }

    return NextResponse.json({ 
      error: 'Sync failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 