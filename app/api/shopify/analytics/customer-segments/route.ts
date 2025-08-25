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

    // Get orders with shipping addresses to calculate customer segments by location
    const { data: ordersData, error: ordersError } = await supabase
      .from('shopify_orders')
      .select(`
        id,
        total_price,
        customer_id,
        customer_email,
        customer_first_name,
        customer_last_name,
        created_at
      `)
      .eq('brand_id', brandId)

    if (ordersError) {
      console.error('Error fetching orders:', ordersError)
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
    }

    // Get real address data from shopify_sales_by_region (populated by webhooks)
    const { data: addressData, error: addressError } = await supabase
      .from('shopify_sales_by_region')
      .select('order_id, city, province, country, country_code')
      .eq('brand_id', brandId)

    if (addressError) {
      console.error('Error fetching regional sales data:', addressError)
      return NextResponse.json({ error: 'Failed to fetch regional sales data' }, { status: 500 })
    }

    // Create a map of order_id to address
    const addressMap = new Map()
    addressData?.forEach(addr => {
      addressMap.set(parseInt(addr.order_id), addr)
    })

    // Group orders by location and calculate customer segments
    const locationStats = {} as Record<string, any>
    const customerLocationMap = new Map() // Track which location each customer is from

    ordersData?.forEach(order => {
      const address = addressMap.get(order.id)
      const country = address?.country || 'Unknown'
      const province = address?.province || 'Unknown' 
      const city = address?.city || 'Unknown'
      const key = `${country}-${province}-${city}`
      
      if (!locationStats[key]) {
        locationStats[key] = {
          country,
          province,
          city,
          customerCount: 0,
          totalRevenue: 0,
          averageOrderValue: 0,
          totalOrders: 0,
          uniqueCustomers: new Set()
        }
      }

      locationStats[key].totalRevenue += parseFloat(order.total_price || '0')
      locationStats[key].totalOrders += 1
      
      // Use customer_id if available, otherwise use email, otherwise use order_id as unique identifier
      const customerId = order.customer_id || order.customer_email || `order_${order.id}`
      if (customerId) {
        locationStats[key].uniqueCustomers.add(customerId)
        customerLocationMap.set(customerId, { country, province, city })
      }
    })

    // Calculate final stats and convert Set to count
    Object.values(locationStats).forEach((location: any) => {
      location.customerCount = location.uniqueCustomers.size
      location.averageOrderValue = location.totalOrders > 0 ? location.totalRevenue / location.totalOrders : 0
      delete location.uniqueCustomers // Remove Set for JSON serialization
    })

    // Convert to array and sort by revenue
    const locationArray = Object.values(locationStats)
      .sort((a: any, b: any) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10) // Top 10 locations

    // Calculate segment tiers based on customer spending
    const customerSpending = new Map()
    ordersData?.forEach(order => {
      const customerId = order.customer_id || order.customer_email || `order_${order.id}`
      if (customerId) {
        const current = customerSpending.get(customerId) || 0
        customerSpending.set(customerId, current + parseFloat(order.total_price || '0'))
      }
    })

    const tierStats = {
      high: { count: 0, revenue: 0 },
      medium: { count: 0, revenue: 0 },
      low: { count: 0, revenue: 0 }
    }

    customerSpending.forEach((totalSpent, customerId) => {
      let tier = 'low'
      if (totalSpent >= 1000) tier = 'high'
      else if (totalSpent >= 300) tier = 'medium'
      
      tierStats[tier as keyof typeof tierStats].count += 1
      tierStats[tier as keyof typeof tierStats].revenue += totalSpent
    })

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalCustomers: customerSpending.size,
          totalSegments: locationArray.length,
          totalRevenue: ordersData?.reduce((sum, order) => sum + parseFloat(order.total_price || '0'), 0) || 0,
          totalClv: Array.from(customerSpending.values()).reduce((sum, spending) => sum + spending, 0),
          averageClv: customerSpending.size > 0 ? Array.from(customerSpending.values()).reduce((sum, spending) => sum + spending, 0) / customerSpending.size : 0
        },
        topLocations: locationArray,
        segmentTiers: tierStats
      }
    })

  } catch (error) {
    console.error('Customer segments API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
