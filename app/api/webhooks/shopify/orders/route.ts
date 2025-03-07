import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  console.log('Shopify webhook received at /api/webhooks/shopify/orders')
  
  try {
    // Verify Shopify webhook
    const hmacHeader = request.headers.get('x-shopify-hmac-sha256')
    const shopHeader = request.headers.get('x-shopify-shop-domain')
    
    console.log('Webhook headers:', {
      shop: shopHeader || 'missing',
      hmac: hmacHeader ? 'present' : 'missing'
    })
    
    if (!hmacHeader || !shopHeader) {
      console.error('Missing required headers:', { 
        hasHmac: !!hmacHeader, 
        hasShop: !!shopHeader 
      })
      return NextResponse.json({ error: 'Missing headers' }, { status: 401 })
    }
    
    // Get the raw body
    let rawBody
    try {
      rawBody = await request.text()
      console.log('Received webhook body length:', rawBody.length)
    } catch (error) {
      console.error('Error reading request body:', error)
      return NextResponse.json({ error: 'Failed to read request body' }, { status: 400 })
    }
    
    // Verify the webhook is from Shopify
    if (!process.env.SHOPIFY_WEBHOOK_SECRET) {
      console.error('SHOPIFY_WEBHOOK_SECRET environment variable is not set')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }
    
    try {
      const calculatedHmac = crypto
        .createHmac('sha256', process.env.SHOPIFY_WEBHOOK_SECRET)
        .update(rawBody, 'utf8')
        .digest('base64')
      
      if (calculatedHmac !== hmacHeader) {
        console.error('HMAC verification failed')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
      
      console.log('HMAC verification successful')
    } catch (error) {
      console.error('Error verifying HMAC:', error)
      return NextResponse.json({ error: 'HMAC verification failed' }, { status: 500 })
    }
    
    // Parse the body
    let order
    try {
      order = JSON.parse(rawBody)
      console.log('Parsed order:', { 
        id: order.id, 
        order_number: order.order_number,
        shop: shopHeader
      })
    } catch (error) {
      console.error('Error parsing JSON body:', error)
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
    }
    
    // Get the connection for this shop
    console.log('Creating Supabase client')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )
    
    console.log('Looking up connection for shop:', shopHeader)
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('id, brand_id, user_id')
      .eq('store_url', shopHeader)
      .eq('platform_type', 'shopify')
      .single()
    
    if (connectionError || !connection) {
      console.error('Connection not found:', connectionError)
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
    }
    
    console.log('Found connection:', { 
      id: connection.id, 
      brand_id: connection.brand_id 
    })
    
    // Store the order
    console.log('Storing order in database:', order.id)
    const { error: orderError } = await supabase
      .from('shopify_orders')
      .upsert([{
        connection_id: connection.id,
        brand_id: connection.brand_id,
        user_id: connection.user_id,
        order_id: order.id.toString(),
        order_number: order.order_number,
        total_price: parseFloat(order.total_price),
        subtotal_price: parseFloat(order.subtotal_price),
        total_tax: parseFloat(order.total_tax),
        total_discounts: parseFloat(order.total_discounts),
        created_at: order.created_at,
        customer: {
          id: order.customer?.id,
          email: order.customer?.email,
          first_name: order.customer?.first_name,
          last_name: order.customer?.last_name,
          orders_count: order.customer?.orders_count
        },
        line_items: order.line_items.map((item: any) => ({
          id: item.id,
          title: item.title,
          quantity: item.quantity,
          price: parseFloat(item.price),
          sku: item.sku,
          product_id: item.product_id,
          variant_id: item.variant_id
        }))
      }], { onConflict: 'order_id' })
    
    if (orderError) {
      console.error('Error storing order:', orderError)
      return NextResponse.json({ error: 'Failed to store order', details: orderError.message }, { status: 500 })
    }
    
    // Store the regional sales data
    console.log('Storing regional sales data for order:', order.id)
    
    // Extract address data from various possible sources
    const shippingAddress = order.shipping_address || {}
    const billingAddress = order.billing_address || {}
    const customerDefaultAddress = order.customer?.default_address || {}
    
    // Use shipping address if available, otherwise try billing address, then customer default address
    const address = shippingAddress.city ? shippingAddress : 
                   billingAddress.city ? billingAddress : 
                   customerDefaultAddress.city ? customerDefaultAddress : null
    
    if (address && address.city) {
      const { error: regionError } = await supabase
        .from('shopify_sales_by_region')
        .upsert([{
          connection_id: connection.id.toString(),
          brand_id: connection.brand_id.toString(),
          user_id: connection.user_id.toString(), // Ensure user_id is stored as text
          order_id: order.id.toString(),
          created_at: order.created_at,
          city: address.city,
          province: address.province,
          province_code: address.province_code,
          country: address.country,
          country_code: address.country_code,
          total_price: parseFloat(order.total_price),
          order_count: 1
        }], { onConflict: 'connection_id,order_id' })
      
      if (regionError) {
        console.error('Error storing regional sales data:', regionError)
        // Continue processing even if regional data storage fails
      } else {
        console.log('Successfully stored regional sales data for order:', order.id)
      }
    } else {
      console.log('No address data available for order:', order.id)
    }
    
    console.log('Successfully stored order:', order.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unhandled error in Shopify webhook:', error)
    return NextResponse.json({ 
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 