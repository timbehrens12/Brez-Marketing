import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const shop = searchParams.get('shop')
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  if (!shop || !from || !to) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
  }

  try {
    // Get access token from database
    const { data: connection } = await supabase
      .from('platform_connections')
      .select('access_token')
      .eq('shop', shop)
      .single()

    if (!connection?.access_token) {
      throw new Error('No access token found')
    }

    // Fetch orders from Shopify
    const ordersResponse = await fetch(
      `https://${shop}/admin/api/2024-01/orders.json?status=any&created_at_min=${from}&created_at_max=${to}&fields=id,created_at,total_price,line_items`, {
        headers: {
          'X-Shopify-Access-Token': connection.access_token
        }
      }
    )

    const ordersData = await ordersResponse.json()
    console.log('Shopify Orders Response:', ordersData)
    const { orders = [] } = ordersData

    if (!orders.length) {
      console.log('No orders found for date range:', { from, to })
    }

    // Calculate metrics
    const totalSales = orders.reduce((sum: number, order: any) => sum + parseFloat(order.total_price), 0)
    const orderCount = orders.length
    const averageOrderValue = orderCount > 0 ? totalSales / orderCount : 0
    const unitsSold = orders.reduce((sum: number, order: any) => 
      sum + order.line_items.reduce((itemSum: number, item: any) => itemSum + item.quantity, 0), 0
    )

    // Group orders by day for revenue chart
    const dailyRevenue = orders.reduce((acc: any, order: any) => {
      const date = order.created_at.split('T')[0]
      acc[date] = (acc[date] || 0) + parseFloat(order.total_price)
      return acc
    }, {})

    const revenueByDay = Object.entries(dailyRevenue).map(([date, revenue]) => ({
      day: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
      date,
      revenue
    }))

    console.log('Metrics calculated:', {
      totalSales,
      orderCount,
      averageOrderValue,
      unitsSold,
      revenueByDay
    })

    return NextResponse.json({
      totalSales,
      ordersPlaced: orderCount,
      averageOrderValue,
      unitsSold,
      revenueByDay,
      salesGrowth: 0, // Add growth calculations later
      ordersGrowth: 0,
      aovGrowth: 0,
      unitsGrowth: 0,
      dailyData: revenueByDay
    })

  } catch (error) {
    console.error('Error fetching Shopify metrics:', error)
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 })
  }
} 