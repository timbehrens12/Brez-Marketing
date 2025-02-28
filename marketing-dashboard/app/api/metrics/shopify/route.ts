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
    const startDate = url.searchParams.get('startDate')
    const endDate = url.searchParams.get('endDate')
    
    if (!brandId || !startDate || !endDate) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // Get the Shopify connection for this brand
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('id')
      .eq('brand_id', brandId)
      .eq('platform_type', 'shopify')
      .eq('status', 'active')
      .single()

    if (connectionError || !connection) {
      return NextResponse.json({ error: 'No active Shopify connection found' }, { status: 404 })
    }

    console.log(`Fetching orders for date range: ${startDate} to ${endDate}`)

    // Get orders for this connection within the date range
    // Add ORDER BY created_at DESC to get the most recent orders first
    const { data: orders, error: ordersError } = await supabase
      .from('shopify_orders')
      .select('*')
      .eq('connection_id', connection.id)
      .gte('created_at', `${startDate}T00:00:00Z`)
      .lte('created_at', `${endDate}T23:59:59Z`)
      .order('created_at', { ascending: false })

    if (ordersError) {
      console.error('Error fetching orders:', ordersError)
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
    }

    console.log(`Found ${orders?.length || 0} orders for connection ${connection.id}`)
    if (orders && orders.length > 0) {
      console.log('Most recent order:', {
        id: orders[0].order_id,
        number: orders[0].order_number,
        date: orders[0].created_at,
        total: orders[0].total_price
      })
    }

    // Calculate metrics
    const metrics = calculateShopifyMetrics(orders || [])
    
    return NextResponse.json(metrics)
  } catch (error) {
    console.error('Error in Shopify metrics endpoint:', error)
    return NextResponse.json({ 
      error: 'Server error', 
      details: typeof error === 'object' && error !== null && 'message' in error 
        ? (error.message as string) 
        : 'Unknown error'
    }, { status: 500 })
  }
}

function calculateShopifyMetrics(orders) {
  // Group orders by day for revenue chart
  const revenueByDay = {}
  const now = new Date()
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  
  // Initialize all days with zero
  for (let d = new Date(thirtyDaysAgo); d <= now; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0]
    revenueByDay[dateStr] = 0
  }
  
  // Calculate total metrics
  let totalSales = 0
  let totalOrders = 0
  let totalUnits = 0
  const productSales = {}
  const customerMap = new Map()
  
  orders.forEach(order => {
    const orderDate = new Date(order.created_at).toISOString().split('T')[0]
    const orderTotal = parseFloat(order.total_price)
    
    // Add to daily revenue
    if (revenueByDay[orderDate] !== undefined) {
      revenueByDay[orderDate] += orderTotal
    }
    
    // Add to totals
    totalSales += orderTotal
    totalOrders++
    
    // Track customer for segmentation
    if (order.customer && order.customer.id) {
      customerMap.set(order.customer.id, {
        id: order.customer.id,
        email: order.customer.email,
        ordersCount: order.customer.orders_count || 1
      })
    }
    
    // Track product sales
    if (order.line_items && Array.isArray(order.line_items)) {
      order.line_items.forEach(item => {
        const units = item.quantity || 1
        totalUnits += units
        
        const productId = item.product_id?.toString() || item.title
        if (!productSales[productId]) {
          productSales[productId] = {
            id: productId,
            title: item.title,
            units: 0,
            revenue: 0
          }
        }
        
        productSales[productId].units += units
        productSales[productId].revenue += parseFloat(item.price) * units
      })
    }
  })
  
  // Calculate average order value
  const aov = totalOrders > 0 ? totalSales / totalOrders : 0
  
  // Format revenue by day for chart
  const revenueData = Object.keys(revenueByDay).map(date => ({
    date,
    revenue: revenueByDay[date]
  })).sort((a, b) => a.date.localeCompare(b.date))
  
  // Get top products
  const topProducts = Object.values(productSales)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)
  
  // Customer segmentation
  const newCustomers = Array.from(customerMap.values()).filter(c => c.ordersCount === 1).length
  const returningCustomers = Array.from(customerMap.values()).filter(c => c.ordersCount > 1).length
  
  // Calculate retention rate
  const customerRetentionRate = customerMap.size > 0 
    ? (returningCustomers / customerMap.size) * 100 
    : 0
  
  return {
    totalSales,
    ordersPlaced: totalOrders,
    averageOrderValue: aov,
    unitsSold: totalUnits,
    revenueByDay: revenueData,
    topProducts,
    salesGrowth: 0, // Would need historical data to calculate
    ordersGrowth: 0,
    unitsGrowth: 0,
    aovGrowth: 0,
    customerSegments: {
      newCustomers,
      returningCustomers
    },
    customerRetentionRate,
    retentionGrowth: 0,
    returnRate: 0,
    returnGrowth: 0,
    conversionRate: 0,
    conversionRateGrowth: 0
  }
} 