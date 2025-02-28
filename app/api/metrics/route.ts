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

    console.log('Found connection:', connection)

    // Fetch orders from Supabase
    const { data: orders, error: ordersError } = await supabase
      .from('shopify_orders')
      .select('*')
      .eq('connection_id', connection.id)
      .gte('created_at', from)
      .lte('created_at', to)

    if (ordersError) throw ordersError

    console.log(`Found ${orders?.length || 0} orders for date range`)

    // Calculate metrics from orders
    const metrics = {
      totalSales: orders?.reduce((sum, order) => sum + parseFloat(order.total_price), 0) || 0,
      ordersPlaced: orders?.length || 0,
      averageOrderValue: orders?.length ? 
        orders.reduce((sum, order) => sum + parseFloat(order.total_price), 0) / orders.length : 0,
      unitsSold: orders?.reduce((sum, order) => 
        sum + order.line_items.reduce((itemSum: number, item: any) => itemSum + item.quantity, 0), 0
      ) || 0,
      revenueByDay: Object.entries((orders || []).reduce((acc, order) => {
        const date = new Date(order.created_at).toISOString().split('T')[0]
        acc[date] = (acc[date] || 0) + parseFloat(order.total_price)
        return acc
      }, {})).map(([date, revenue]) => ({
        date,
        revenue,
        amount: revenue
      })).sort((a, b) => a.date.localeCompare(b.date)),
      customerSegments: [
        { 
          name: 'new', 
          value: new Set(orders?.map(o => o.customer_id) || []).size 
        },
        { 
          name: 'returning', 
          value: (orders?.length || 0) - new Set(orders?.map(o => o.customer_id) || []).size 
        }
      ]
    }

    return NextResponse.json(metrics)

  } catch (error) {
    console.error('Error fetching metrics:', error)
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 })
  }
} 