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

    // Fetch data from Shopify
    const response = await fetch(
      `https://${shop}/admin/api/2024-01/reports.json?` + new URLSearchParams({
        date_from: from,
        date_to: to,
        fields: 'sales,orders,average_order_value,units_sold'
      }), {
        headers: {
          'X-Shopify-Access-Token': connection.access_token,
          'Content-Type': 'application/json'
        }
      }
    )

    const data = await response.json()

    // Transform data into our metrics format
    return NextResponse.json({
      totalSales: data.sales,
      ordersPlaced: data.orders,
      averageOrderValue: data.average_order_value,
      unitsSold: data.units_sold,
      // Add other metrics as needed
      revenueByDay: data.daily_sales.map((day: any) => ({
        day: new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }),
        date: day.date,
        revenue: day.sales
      }))
    })

  } catch (error) {
    console.error('Error fetching Shopify metrics:', error)
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 })
  }
} 