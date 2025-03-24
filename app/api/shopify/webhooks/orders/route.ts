import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  console.log('Shopify order webhook received')
  
  try {
    // Get shop domain from headers
    const shopDomain = request.headers.get('x-shopify-shop-domain')
    const hmacHeader = request.headers.get('x-shopify-hmac-sha256')
    
    console.log('Webhook headers:', { 
      shop: shopDomain,
      hmac: hmacHeader ? 'present' : 'missing'
    })
    
    if (!shopDomain) {
      console.error('Missing shop domain header')
      return NextResponse.json({ error: 'Missing shop domain header' }, { status: 400 })
    }

    // Parse payload
    let payload
    try {
      payload = await request.json()
      console.log('Received Shopify order webhook for order:', { 
        id: payload.id,
        order_number: payload.order_number,
        shop: shopDomain
      })
    } catch (parseError) {
      console.error('Error parsing webhook payload:', parseError)
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
    }

    // Get connection_id from platform_connections using shop domain
    console.log('Looking up connection for shop:', shopDomain)
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('id')
      .eq('shop', shopDomain)
      .single()

    if (connectionError || !connection) {
      console.error('No connection found for shop:', shopDomain, connectionError)
      return NextResponse.json({ 
        error: `No connection found for shop: ${shopDomain}` 
      }, { status: 404 })
    }

    console.log('Found connection:', connection.id)

    // Insert order into database
    console.log('Inserting order into database:', payload.id)
    const { error: insertError } = await supabase
      .from('shopify_orders')
      .upsert({
        id: payload.id.toString(),
        created_at: payload.created_at,
        total_price: payload.total_price,
        customer_id: payload.customer?.id?.toString(),
        line_items: payload.line_items,
        connection_id: connection.id
      }, { onConflict: 'id' })

    if (insertError) {
      console.error('Error saving order to database:', insertError)
      return NextResponse.json({ 
        error: 'Error saving order to database',
        details: insertError.message
      }, { status: 500 })
    }
    
    console.log('Successfully saved order to database:', payload.id)
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Unhandled error in Shopify webhook:', error)
    return NextResponse.json({ 
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 