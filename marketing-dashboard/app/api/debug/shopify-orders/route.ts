import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
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

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    // Get the connection ID
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('id')
      .eq('brand_id', brandId)
      .eq('platform_type', 'shopify')
      .single()

    if (connectionError) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
    }

    // Get all orders for this connection
    const { data: orders, error: ordersError } = await supabase
      .from('shopify_orders')
      .select('*')
      .eq('connection_id', connection.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (ordersError) {
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
    }

    // Return simplified order data
    const simplifiedOrders = orders.map(order => ({
      id: order.order_id,
      number: order.order_number,
      created_at: order.created_at,
      total_price: order.total_price,
      customer: order.customer ? {
        id: order.customer.id,
        email: order.customer.email
      } : null
    }))

    return NextResponse.json({
      total_orders: orders.length,
      recent_orders: simplifiedOrders
    })
  } catch (error) {
    console.error('Error in debug endpoint:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
} 