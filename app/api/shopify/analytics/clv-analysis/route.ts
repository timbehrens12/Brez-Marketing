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

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    const supabase = createClient()

    // Get orders data to calculate CLV
    const { data: ordersData, error: ordersError } = await supabase
      .from('shopify_orders')
      .select('id, total_price, customer_id, customer_email, customer_first_name, customer_last_name, created_at')
      .eq('brand_id', brandId)

    if (ordersError) {
      console.error('Error fetching orders:', ordersError)
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
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

    // Calculate CLV for each customer
    const customerMetrics = new Map()
    
    ordersData?.forEach(order => {
      // Use customer_id if available, otherwise use email, otherwise use order_id as unique identifier
      const customerId = order.customer_id || order.customer_email || `order_${order.id}`
      if (!customerId) return
      
      if (!customerMetrics.has(customerId)) {
        const address = orderAddressMap.get(order.id) // Use order_id for address lookup
        customerMetrics.set(customerId, {
          customer_id: customerId,
          customer_email: order.customer_email,
          customer_name: `${order.customer_first_name || ''} ${order.customer_last_name || ''}`.trim(),
          total_spent: 0,
          total_orders: 0,
          first_order_date: order.created_at,
          last_order_date: order.created_at,
          city: address?.city || '',
          province: address?.province || '',
          country: address?.country || ''
        })
      }
      
      const customer = customerMetrics.get(customerId)
      customer.total_spent += parseFloat(order.total_price || '0')
      customer.total_orders += 1
      
      if (new Date(order.created_at) < new Date(customer.first_order_date)) {
        customer.first_order_date = order.created_at
      }
      if (new Date(order.created_at) > new Date(customer.last_order_date)) {
        customer.last_order_date = order.created_at
      }
    })

    // Calculate CLV and additional metrics
    const clvData = Array.from(customerMetrics.values()).map(customer => {
      const daysSinceFirstOrder = Math.max(1, Math.floor((new Date().getTime() - new Date(customer.first_order_date).getTime()) / (1000 * 60 * 60 * 24)))
      const orderFrequency = customer.total_orders / (daysSinceFirstOrder / 365.25) // Orders per year
      const avgOrderValue = customer.total_spent / customer.total_orders
      
      // Simple CLV calculation: (Average Order Value) × (Order Frequency) × (Customer Lifespan in years)
      // Assume 2-year average lifespan for estimation
      const estimatedLifespan = 2
      const currentClv = avgOrderValue * orderFrequency * estimatedLifespan
      const predictedClv = currentClv * 1.2 // 20% growth potential
      
      // Engagement level based on order frequency
      let engagementLevel = 'low'
      if (orderFrequency >= 4) engagementLevel = 'high'
      else if (orderFrequency >= 2) engagementLevel = 'medium'
      
      // Churn risk based on days since last order
      const daysSinceLastOrder = Math.floor((new Date().getTime() - new Date(customer.last_order_date).getTime()) / (1000 * 60 * 60 * 24))
      let churnRiskScore = Math.min(100, (daysSinceLastOrder / 90) * 100) // Higher risk after 90 days
      
      return {
        customer_id: customer.customer_id,
        customer_email: customer.customer_email,
        customer_name: customer.customer_name,
        current_clv: currentClv.toFixed(2),
        predicted_clv: predictedClv.toFixed(2),
        total_orders: customer.total_orders,
        total_spent: customer.total_spent.toFixed(2),
        engagement_level: engagementLevel,
        churn_risk_score: churnRiskScore.toFixed(1),
        city: customer.city,
        province: customer.province,
        country: customer.country
      }
    }).sort((a, b) => parseFloat(b.current_clv) - parseFloat(a.current_clv))

    // Calculate CLV distribution
    const clvTiers = {
      high: clvData?.filter(c => parseFloat(c.current_clv || '0') >= 500) || [],
      medium: clvData?.filter(c => parseFloat(c.current_clv || '0') >= 100 && parseFloat(c.current_clv || '0') < 500) || [],
      low: clvData?.filter(c => parseFloat(c.current_clv || '0') < 100) || []
    }

    // Calculate engagement levels
    const engagementStats = clvData?.reduce((acc, customer) => {
      const level = customer.engagement_level || 'low'
      if (!acc[level]) {
        acc[level] = { count: 0, totalClv: 0, avgClv: 0 }
      }
      acc[level].count += 1
      acc[level].totalClv += parseFloat(customer.current_clv || '0')
      return acc
    }, {} as Record<string, any>) || {}

    // Calculate averages
    Object.values(engagementStats).forEach((stat: any) => {
      stat.avgClv = stat.count > 0 ? stat.totalClv / stat.count : 0
    })

    // Calculate churn risk distribution
    const churnRiskStats = clvData?.reduce((acc, customer) => {
      const riskScore = parseFloat(customer.churn_risk_score || '0')
      let riskLevel = 'low'
      if (riskScore >= 70) riskLevel = 'high'
      else if (riskScore >= 40) riskLevel = 'medium'

      if (!acc[riskLevel]) {
        acc[riskLevel] = { count: 0, totalClv: 0 }
      }
      acc[riskLevel].count += 1
      acc[riskLevel].totalClv += parseFloat(customer.current_clv || '0')
      return acc
    }, {} as Record<string, any>) || {}

    // Top customers by CLV
    const topCustomers = clvData?.slice(0, 10).map(customer => ({
      id: customer.customer_id,
      email: customer.customer_email,
      name: customer.customer_name,
      clv: parseFloat(customer.current_clv || '0'),
      predictedClv: parseFloat(customer.predicted_clv || '0'),
      totalOrders: customer.total_orders || 0,
      totalSpent: parseFloat(customer.total_spent || '0'),
      churnRisk: parseFloat(customer.churn_risk_score || '0'),
      location: `${customer.city || ''}, ${customer.province || ''}, ${customer.country || ''}`.replace(/^, |, $/, '')
    })) || []

    // Calculate overall metrics
    const totalCustomers = clvData?.length || 0
    const totalClv = clvData?.reduce((sum, c) => sum + parseFloat(c.current_clv || '0'), 0) || 0
    const avgClv = totalCustomers > 0 ? totalClv / totalCustomers : 0
    const totalPredictedClv = clvData?.reduce((sum, c) => sum + parseFloat(c.predicted_clv || '0'), 0) || 0

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalCustomers,
          totalClv,
          averageClv: avgClv,
          totalPredictedClv,
          growthPotential: totalPredictedClv - totalClv
        },
        clvTiers: {
          high: { count: clvTiers.high.length, totalClv: clvTiers.high.reduce((sum, c) => sum + parseFloat(c.current_clv || '0'), 0) },
          medium: { count: clvTiers.medium.length, totalClv: clvTiers.medium.reduce((sum, c) => sum + parseFloat(c.current_clv || '0'), 0) },
          low: { count: clvTiers.low.length, totalClv: clvTiers.low.reduce((sum, c) => sum + parseFloat(c.current_clv || '0'), 0) }
        },
        engagementLevels: engagementStats,
        churnRisk: churnRiskStats,
        topCustomers
      }
    })

  } catch (error) {
    console.error('CLV analytics API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
