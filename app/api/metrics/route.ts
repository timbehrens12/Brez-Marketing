import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  if (!from || !to) {
    return NextResponse.json({ error: 'Missing date range' }, { status: 400 })
  }

  try {
    // Get active Shopify connection
    const { data: connection } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('platform_type', 'shopify')
      .eq('status', 'active')
      .single()

    if (!connection?.access_token || !connection.shop) {
      return NextResponse.json({ error: 'No active Shopify connection' }, { status: 400 })
    }

    // Fetch orders from Shopify
    const response = await fetch(
      `https://${connection.shop}/admin/api/2024-01/orders.json?status=any&created_at_min=${from}&created_at_max=${to}`, {
        headers: {
          'X-Shopify-Access-Token': connection.access_token
        }
      }
    )

    const { orders = [] } = await response.json()

    // Calculate metrics
    const metrics = {
      totalSales: orders.reduce((sum: number, order: any) => sum + parseFloat(order.total_price), 0),
      ordersPlaced: orders.length,
      averageOrderValue: orders.length > 0 ? 
        orders.reduce((sum: number, order: any) => sum + parseFloat(order.total_price), 0) / orders.length : 0,
      unitsSold: orders.reduce((sum: number, order: any) => 
        sum + order.line_items.reduce((itemSum: number, item: any) => itemSum + item.quantity, 0), 0
      ),
      revenueByDay: Object.entries(orders.reduce((acc: any, order: any) => {
        const date = order.created_at.split('T')[0]
        acc[date] = (acc[date] || 0) + parseFloat(order.total_price)
        return acc
      }, {})).map(([date, revenue]) => ({
        date,
        revenue
      }))
    }

    return NextResponse.json(metrics)
  } catch (error) {
    console.error('Error fetching metrics:', error)
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 })
  }
} 