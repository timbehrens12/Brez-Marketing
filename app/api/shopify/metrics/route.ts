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
      `https://${shop}/admin/api/2024-01/orders.json?status=any&created_at_min=${from}&created_at_max=${to}&fields=id,created_at,total_price,line_items,customer`, {
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

    // Fetch customers from Shopify
    const customersResponse = await fetch(
      `https://${shop}/admin/api/2024-01/customers.json?created_at_min=${from}&created_at_max=${to}&fields=id,email,orders_count,total_spent`, {
        headers: {
          'X-Shopify-Access-Token': connection.access_token
        }
      }
    )

    const customersData = await customersResponse.json()
    console.log('Shopify Customers Response:', customersData)
    const { customers = [] } = customersData

    // Calculate metrics
    const totalSales = orders.reduce((sum: number, order: any) => sum + parseFloat(order.total_price), 0)
    const orderCount = orders.length
    const averageOrderValue = orderCount > 0 ? totalSales / orderCount : 0
    const unitsSold = orders.reduce((sum: number, order: any) => 
      sum + order.line_items.reduce((itemSum: number, item: any) => itemSum + item.quantity, 0), 0
    )

    // Calculate customer metrics
    const newCustomers = customers.filter((customer: any) => customer.orders_count === 1).length
    const returningCustomers = customers.filter((customer: any) => customer.orders_count > 1).length
    const totalCustomers = customers.length

    // Estimate sessions and conversion rate (since we don't have direct access to this data)
    // This is an approximation - in a real app, you'd use analytics data
    const estimatedSessions = Math.max(orderCount * 20, 100) // Rough estimate: 20 sessions per order, minimum 100
    const conversionRate = orderCount > 0 ? (orderCount / estimatedSessions) * 100 : 0

    // Group orders by day for revenue chart
    const dailyRevenue = orders.reduce((acc: any, order: any) => {
      const date = order.created_at.split('T')[0]
      acc[date] = (acc[date] || 0) + parseFloat(order.total_price)
      return acc
    }, {})

    // Group orders by day for daily data
    const dailyOrders = orders.reduce((acc: any, order: any) => {
      const date = order.created_at.split('T')[0]
      acc[date] = (acc[date] || 0) + 1
      return acc
    }, {})

    // Create daily data array with orders and revenue
    const dailyData = Object.keys(dailyRevenue).map(date => ({
      date,
      revenue: dailyRevenue[date],
      orders: dailyOrders[date] || 0,
      value: dailyRevenue[date] // For MetricCard compatibility
    }))

    const revenueByDay = Object.entries(dailyRevenue).map(([date, revenue]) => ({
      day: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
      date,
      revenue
    }))

    // Calculate top products
    const productSales: Record<string, { id: string, title: string, quantity: number, revenue: number }> = {}
    
    orders.forEach((order: any) => {
      order.line_items.forEach((item: any) => {
        const productId = item.product_id?.toString() || item.id?.toString() || 'unknown'
        
        if (!productSales[productId]) {
          productSales[productId] = {
            id: productId,
            title: item.title || item.name || 'Unknown Product',
            quantity: 0,
            revenue: 0
          }
        }
        
        productSales[productId].quantity += item.quantity || 0
        productSales[productId].revenue += (parseFloat(item.price) * (item.quantity || 1))
      })
    })
    
    const topProducts = Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)

    console.log('Metrics calculated:', {
      totalSales,
      orderCount,
      averageOrderValue,
      unitsSold,
      conversionRate,
      newCustomers,
      returningCustomers,
      revenueByDay,
      topProducts
    })

    return NextResponse.json({
      totalSales,
      ordersPlaced: orderCount,
      averageOrderValue,
      unitsSold,
      conversionRate,
      revenueByDay,
      salesGrowth: 0, // Add growth calculations later
      ordersGrowth: 0,
      aovGrowth: 0,
      unitsGrowth: 0,
      conversionRateGrowth: 0,
      customerSegments: {
        newCustomers,
        returningCustomers
      },
      topProducts,
      dailyData
    })

  } catch (error) {
    console.error('Error fetching Shopify metrics:', error)
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 })
  }
} 