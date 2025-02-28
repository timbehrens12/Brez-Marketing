import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const url = new URL(request.url)
    const brandId = url.searchParams.get('brandId')
    
    if (!brandId) {
      return NextResponse.json({ error: 'Missing brandId parameter' }, { status: 400 })
    }

    // Get the Shopify connection
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('brand_id', brandId)
      .eq('platform_type', 'shopify')
      .eq('status', 'active')
      .single()

    if (connectionError || !connection) {
      return NextResponse.json({ error: 'No active Shopify connection found' }, { status: 404 })
    }

    // Fetch orders from Shopify
    const ordersResponse = await fetch(
      `https://${connection.store_url}/admin/api/2023-04/orders.json?status=any&limit=250`,
      {
        headers: {
          'X-Shopify-Access-Token': connection.access_token
        }
      }
    )

    if (!ordersResponse.ok) {
      throw new Error(`Failed to fetch orders: ${ordersResponse.status}`)
    }

    const { orders } = await ordersResponse.json()
    
    // Store orders in database
    for (const order of orders) {
      const { error: orderError } = await supabase
        .from('shopify_orders')
        .upsert({
          connection_id: connection.id,
          brand_id: brandId,
          user_id: userId,
          order_id: order.id.toString(),
          order_number: order.order_number,
          total_price: parseFloat(order.total_price),
          subtotal_price: parseFloat(order.subtotal_price),
          total_tax: parseFloat(order.total_tax),
          total_discounts: parseFloat(order.total_discounts),
          created_at: order.created_at,
          customer: order.customer,
          line_items: order.line_items
        }, { onConflict: 'order_id' })

      if (orderError) {
        console.error(`Error storing order ${order.id}:`, orderError)
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Synced ${orders.length} orders` 
    })
  } catch (error) {
    console.error('Error in Shopify sync endpoint:', error)
    return NextResponse.json({ 
      error: 'Server error', 
      details: typeof error === 'object' && error !== null && 'message' in error 
        ? (error.message as string) 
        : 'Unknown error'
    }, { status: 500 })
  }
} 