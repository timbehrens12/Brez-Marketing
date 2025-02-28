import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    // Verify Shopify webhook
    const hmacHeader = request.headers.get('x-shopify-hmac-sha256')
    const shopHeader = request.headers.get('x-shopify-shop-domain')
    
    if (!hmacHeader || !shopHeader) {
      return NextResponse.json({ error: 'Missing headers' }, { status: 401 })
    }
    
    // Get the raw body
    const rawBody = await request.text()
    
    // Verify the webhook is from Shopify
    const calculatedHmac = crypto
      .createHmac('sha256', process.env.SHOPIFY_WEBHOOK_SECRET!)
      .update(rawBody, 'utf8')
      .digest('base64')
    
    if (calculatedHmac !== hmacHeader) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
    
    // Parse the body
    const order = JSON.parse(rawBody)
    
    // Get the connection for this shop
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )
    
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('id, brand_id, user_id')
      .eq('store_url', shopHeader)
      .eq('platform_type', 'shopify')
      .single()
    
    if (connectionError || !connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
    }
    
    // Store the order
    const { error: orderError } = await supabase
      .from('shopify_orders')
      .insert([{
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
        line_items: order.line_items.map(item => ({
          id: item.id,
          title: item.title,
          quantity: item.quantity,
          price: parseFloat(item.price),
          sku: item.sku,
          product_id: item.product_id,
          variant_id: item.variant_id
        }))
      }])
    
    if (orderError) {
      console.error('Error storing order:', orderError)
      return NextResponse.json({ error: 'Failed to store order' }, { status: 500 })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in Shopify webhook:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
} 