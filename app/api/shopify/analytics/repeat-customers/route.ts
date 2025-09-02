import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { auth } from '@clerk/nextjs/server'

export async function GET(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const brandId = searchParams.get('brandId')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    const supabase = createClient()

    // Get orders data to calculate repeat customer metrics
    let ordersQuery = supabase
      .from('shopify_orders')
      .select('id, total_price, customer_id, customer_email, customer_first_name, customer_last_name, created_at')
      .eq('brand_id', brandId)

    // Apply date range filter if provided - convert to Central timezone properly
    if (from) {
      ordersQuery = ordersQuery.gte('created_at', from + 'T06:00:00Z') // Start of day in Central (UTC-6)
    }
    if (to) {
      // For "to" date, we need the next day at 5:59 AM UTC to cover until 11:59 PM Central
      const toDate = new Date(to)
      toDate.setDate(toDate.getDate() + 1)
      const nextDay = toDate.toISOString().split('T')[0]
      ordersQuery = ordersQuery.lte('created_at', nextDay + 'T05:59:59Z')
    }

    const { data: ordersData, error: ordersError } = await ordersQuery.order('created_at', { ascending: true })

    if (ordersError) {
      console.error('Error fetching orders:', ordersError)
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
    }

    // Debug logging to check what data we're getting
    console.log(`[Repeat Customers API] Fetched ${ordersData?.length || 0} orders for brand ${brandId}`)
    if (from || to) {
      console.log(`[Repeat Customers API] Date range filter: ${from} to ${to}`)
    }
    if (ordersData && ordersData.length > 0) {
      console.log(`[Repeat Customers API] Sample order:`, {
        id: ordersData[0].id,
        customer_id: ordersData[0].customer_id,
        customer_email: ordersData[0].customer_email,
        total_price: ordersData[0].total_price,
        created_at: ordersData[0].created_at
      })
    }

    // Get real address data from shopify_sales_by_region (populated by webhooks)
    const { data: addressData, error: addressError } = await supabase
      .from('shopify_sales_by_region')
      .select('order_id, city, province, country')
      .eq('brand_id', brandId)

    if (addressError) {
      console.error('Error fetching regional sales data:', addressError)
      return NextResponse.json({ error: 'Failed to fetch regional sales data' }, { status: 500 })
    }

    // Create a map of order_id to address
    const orderAddressMap = new Map()
    addressData?.forEach(addr => {
      orderAddressMap.set(parseInt(addr.order_id), addr)
    })

    // Calculate repeat customer metrics
    const customerOrderHistory = new Map()
    
    // Processing orders
    
    ordersData?.forEach((order, index) => {
      // Use customer_id if available, otherwise use email, but skip orders without real customer data
      if (index < 3) { // Log first 3 orders for debugging
        // Processing order
      }
      const customerId = order.customer_id || (order.customer_email && order.customer_email.trim() !== '' ? order.customer_email : null)
      if (!customerId) return // Skip orders without proper customer identification
      
      if (!customerOrderHistory.has(customerId)) {
        const address = orderAddressMap.get(order.id) // Use order_id for address lookup
        customerOrderHistory.set(customerId, {
          customer_id: customerId,
          customer_email: order.customer_email,
          customer_name: `${order.customer_first_name || ''} ${order.customer_last_name || ''}`.trim(),
          orders: [],
          total_spent: 0,
          city: address?.city || '',
          province: address?.province || '',
          country: address?.country || ''
        })
      }
      
      const customer = customerOrderHistory.get(customerId)
      customer.orders.push({
        id: order.id,
        total_price: parseFloat(order.total_price || '0'),
        created_at: order.created_at
      })
      customer.total_spent += parseFloat(order.total_price || '0')
    })

    // Calculate repeat customer data
    const repeatData = Array.from(customerOrderHistory.values()).map(customer => {
      const totalOrders = customer.orders.length
      const repeatOrders = Math.max(0, totalOrders - 1)
      const repeatRate = totalOrders > 0 ? (repeatOrders / totalOrders) * 100 : 0
      
      // Calculate average days between orders
      let avgDaysBetween = 0
      if (customer.orders.length > 1) {
        const sortedOrders = customer.orders.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        let totalDays = 0
        for (let i = 1; i < sortedOrders.length; i++) {
          const prevDate = new Date(sortedOrders[i-1].created_at)
          const currDate = new Date(sortedOrders[i].created_at)
          totalDays += (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
        }
        avgDaysBetween = totalDays / (sortedOrders.length - 1)
      }
      
      // Calculate repeat order value (excluding first order)
      const repeatOrderValue = repeatOrders > 0 ? 
        customer.orders.slice(1).reduce((sum, order) => sum + order.total_price, 0) : 0
      
      // Predict next purchase (simple estimate)
      const lastOrder = customer.orders[customer.orders.length - 1]
      const daysSinceLastOrder = Math.floor((new Date().getTime() - new Date(lastOrder.created_at).getTime()) / (1000 * 60 * 60 * 24))
      const nextPurchasePrediction = avgDaysBetween > 0 ? 
        Math.max(0, Math.round(avgDaysBetween - daysSinceLastOrder)) : null
      
      return {
        customer_id: customer.customer_id,
        customer_email: customer.customer_email,
        customer_name: customer.customer_name,
        total_orders: totalOrders,
        repeat_orders: repeatOrders,
        repeat_rate: repeatRate,
        total_spent: customer.total_spent.toFixed(2),
        average_order_value: (customer.total_spent / totalOrders).toFixed(2),
        avg_days_between_orders: Math.round(avgDaysBetween),
        repeat_order_value: repeatOrderValue.toFixed(2),
        next_purchase_prediction: nextPurchasePrediction,
        city: customer.city,
        province: customer.province,
        country: customer.country
      }
    }).sort((a, b) => b.repeat_orders - a.repeat_orders)

    // Calculate repeat customer metrics
    const totalCustomers = repeatData?.length || 0
    const repeatCustomers = repeatData?.filter(c => (c.repeat_orders || 0) > 0) || []
    const repeatRate = totalCustomers > 0 ? (repeatCustomers.length / totalCustomers) * 100 : 0

    // Calculate frequency segments
    const frequencySegments = {
      frequent: repeatData?.filter(c => (c.avg_days_between_orders || 999) <= 30) || [],
      regular: repeatData?.filter(c => (c.avg_days_between_orders || 999) > 30 && (c.avg_days_between_orders || 999) <= 90) || [],
      occasional: repeatData?.filter(c => (c.avg_days_between_orders || 999) > 90) || []
    }

    // Top repeat customers
    const topRepeaters = repeatCustomers.slice(0, 10).map(customer => ({
      id: customer.customer_id,
      email: customer.customer_email,
      name: customer.customer_name,
      totalOrders: customer.total_orders || 0,
      repeatOrders: customer.repeat_orders || 0,
      repeatRate: customer.repeat_rate || 0,
      totalSpent: parseFloat(customer.total_spent || '0'),
      avgOrderValue: parseFloat(customer.average_order_value || '0'),
      avgDaysBetween: customer.avg_days_between_orders || 0,
      location: `${customer.city || ''}, ${customer.province || ''}, ${customer.country || ''}`.replace(/^, |, $/, ''),
      nextPurchasePrediction: customer.next_purchase_prediction
    }))

    // Calculate revenue from repeat customers
    const repeatRevenue = repeatCustomers.reduce((sum, c) => sum + parseFloat(c.repeat_order_value || '0'), 0)
    const totalRevenue = repeatData?.reduce((sum, c) => sum + parseFloat(c.total_spent || '0'), 0) || 0
    const repeatRevenuePercentage = totalRevenue > 0 ? (repeatRevenue / totalRevenue) * 100 : 0

    // Location-based repeat rates
    const locationStats = repeatData?.reduce((acc, customer) => {
      const location = `${customer.country || 'Unknown'}, ${customer.province || 'Unknown'}`
      if (!acc[location]) {
        acc[location] = {
          location,
          totalCustomers: 0,
          repeatCustomers: 0,
          repeatRate: 0,
          avgRepeatOrders: 0
        }
      }

      acc[location].totalCustomers += 1
      if ((customer.repeat_orders || 0) > 0) {
        acc[location].repeatCustomers += 1
      }
      acc[location].avgRepeatOrders += customer.repeat_orders || 0

      return acc
    }, {} as Record<string, any>) || {}

    // Calculate location repeat rates
    Object.values(locationStats).forEach((stat: any) => {
      stat.repeatRate = stat.totalCustomers > 0 ? (stat.repeatCustomers / stat.totalCustomers) * 100 : 0
      stat.avgRepeatOrders = stat.totalCustomers > 0 ? stat.avgRepeatOrders / stat.totalCustomers : 0
    })

    const locationArray = Object.values(locationStats)
      .sort((a: any, b: any) => b.repeatRate - a.repeatRate)
      .slice(0, 8)

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalCustomers,
          repeatCustomers: repeatCustomers.length,
          repeatRate,
          repeatRevenue,
          repeatRevenuePercentage,
          avgDaysBetweenOrders: repeatCustomers.length > 0 ? 
            repeatCustomers.reduce((sum, c) => sum + (c.avg_days_between_orders || 0), 0) / repeatCustomers.length : 0
        },
        frequencySegments: {
          frequent: { count: frequencySegments.frequent.length, revenue: frequencySegments.frequent.reduce((sum, c) => sum + parseFloat(c.total_spent || '0'), 0) },
          regular: { count: frequencySegments.regular.length, revenue: frequencySegments.regular.reduce((sum, c) => sum + parseFloat(c.total_spent || '0'), 0) },
          occasional: { count: frequencySegments.occasional.length, revenue: frequencySegments.occasional.reduce((sum, c) => sum + parseFloat(c.total_spent || '0'), 0) }
        },
        topRepeaters,
        locationBreakdown: locationArray
      }
    })

  } catch (error) {
    console.error('Repeat customers API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
