import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const brandId = searchParams.get('brandId')
  const platform = searchParams.get('platform')

  console.log('Received metrics request:', { from, to, brandId, platform })

  if (!from || !to || !brandId) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
  }

  try {
    // Get active platform connection
    const { data: connection } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('platform_type', platform || 'shopify')
      .eq('brand_id', brandId)
      .eq('status', 'active')
      .single()

    if (!connection) {
      console.log('No active connection found')
      return NextResponse.json({
        totalSales: 0,
        ordersPlaced: 0,
        averageOrderValue: 0,
        unitsSold: 0,
        revenueByDay: [],
        salesGrowth: 0,
        ordersGrowth: 0,
        unitsGrowth: 0,
        aovGrowth: 0,
        customerSegments: [
          { name: 'new', value: 0 },
          { name: 'returning', value: 0 }
        ]
      })
    }

    // Fetch orders from Supabase
    const { data: orders, error } = await supabase
      .from('shopify_orders')
      .select(`
        id,
        created_at,
        total_price,
        customer_id,
        line_items
      `)
      .eq('connection_id', connection.id)
      .gte('created_at', from)
      .lte('created_at', to)

    if (error) {
      console.error('Supabase error:', error)
      throw error
    }

    console.log(`Fetched ${orders?.length || 0} orders from Supabase`)

    // Calculate metrics
    const totalSales = (orders || []).reduce((sum, order) => sum + parseFloat(order.total_price), 0)
    const uniqueCustomers = new Set((orders || []).map(order => order.customer_id)).size

    const metrics = {
      totalSales,
      ordersPlaced: orders?.length || 0,
      averageOrderValue: orders?.length ? totalSales / orders.length : 0,
      unitsSold: (orders || []).reduce((sum, order) => 
        sum + order.line_items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
      ),
      revenueByDay: Object.entries((orders || []).reduce((acc, order) => {
        const date = new Date(order.created_at).toISOString().split('T')[0]
        acc[date] = (acc[date] || 0) + parseFloat(order.total_price)
        return acc
      }, {})).map(([date, revenue]) => ({
        date,
        revenue
      })),
      salesGrowth: 0, // TODO: Calculate growth
      ordersGrowth: 0,
      unitsGrowth: 0,
      aovGrowth: 0,
      customerSegments: [
        { name: 'new', value: uniqueCustomers },
        { name: 'returning', value: (orders?.length || 0) - uniqueCustomers }
      ]
    }

    console.log('Calculated metrics:', metrics)
    return NextResponse.json(metrics)

  } catch (error) {
    console.error('Error fetching metrics:', error)
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 })
  }
} 