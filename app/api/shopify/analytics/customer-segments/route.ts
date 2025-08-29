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

    // Get orders with shipping addresses to calculate customer segments by location
    let ordersQuery = supabase
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

    // Apply date range filter if provided
    if (from) {
      ordersQuery = ordersQuery.gte('created_at', from + 'T00:00:00Z')
    }
    if (to) {
      ordersQuery = ordersQuery.lte('created_at', to + 'T23:59:59Z')
    }

    const { data: ordersData, error: ordersError } = await ordersQuery

    if (ordersError) {
      // Error fetching orders
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
    }

    // Debug logging to check what data we're getting
    // Fetched orders for brand
    if (from || to) {
      // Date range filter applied
    }
    if (ordersData && ordersData.length > 0) {
      // Sample order logged
    }

    // Get real address data from shopify_sales_by_region (populated by webhooks)
    const { data: addressData, error: addressError } = await supabase
      .from('shopify_sales_by_region')
      .select('order_id, city, province, country, country_code')
      .eq('brand_id', brandId)

    if (addressError) {
      // Error fetching regional sales data
      return NextResponse.json({ error: 'Failed to fetch regional sales data' }, { status: 500 })
    }

    // Create a map of order_id to address
    const addressMap = new Map()
    // Fetched address records
    addressData?.forEach(addr => {
      addressMap.set(parseInt(addr.order_id), addr)
    })
    
    if (addressData && addressData.length > 0) {
      // Sample address logged
    }

    // First pass: Build customer email to customer_id mapping for consistent identification
    const emailToCustomerId = new Map()
    ordersData?.forEach(order => {
      if (order.customer_email && order.customer_id) {
        emailToCustomerId.set(order.customer_email, order.customer_id)
      }
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

      // Improved customer identification: prioritize consistent identification
      let customerId = order.customer_id

      if (!customerId && order.customer_email) {
        // Check if we've seen this email before
        const existingCustomerId = emailToCustomerId.get(order.customer_email)
        if (existingCustomerId) {
          customerId = existingCustomerId
        } else {
          // Use email as fallback identifier
          customerId = order.customer_email
        }
      }

      // Final fallback to order_id if nothing else available
      if (!customerId) {
        customerId = `order_${order.id}`
      }

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
      // Use the same improved customer identification logic
      let customerId = order.customer_id

      if (!customerId && order.customer_email) {
        const existingCustomerId = emailToCustomerId.get(order.customer_email)
        if (existingCustomerId) {
          customerId = existingCustomerId
        } else {
          customerId = order.customer_email
        }
      }

      if (!customerId) {
        customerId = `order_${order.id}`
      }

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
    // Customer segments API error
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
