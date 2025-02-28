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

    // Get the Shopify connection
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

    // Get today's date in ISO format
    const today = new Date().toISOString().split('T')[0]

    // Fetch orders directly from Shopify for today
    const ordersResponse = await fetch(
      `https://${connection.store_url}/admin/api/2023-04/orders.json?status=any&created_at_min=${today}T00:00:00Z`,
      {
        headers: {
          'X-Shopify-Access-Token': connection.access_token
        }
      }
    )

    if (!ordersResponse.ok) {
      return NextResponse.json({ 
        error: 'Failed to fetch from Shopify API',
        status: ordersResponse.status,
        statusText: ordersResponse.statusText
      }, { status: 500 })
    }

    const { orders } = await ordersResponse.json()
    
    return NextResponse.json({
      today,
      orders_count: orders.length,
      orders: orders.map(o => ({
        id: o.id,
        order_number: o.order_number,
        created_at: o.created_at,
        total_price: o.total_price
      }))
    })
  } catch (error) {
    console.error('Error in direct Shopify check:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
} 