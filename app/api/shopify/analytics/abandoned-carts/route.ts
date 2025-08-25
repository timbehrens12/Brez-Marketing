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

    // Get abandoned checkouts data
    let query = supabase
      .from('shopify_abandoned_checkouts')
      .select('*')
      .eq('brand_id', brandId)

    if (from) {
      query = query.gte('created_at', from)
    }
    if (to) {
      query = query.lte('created_at', to)
    }

    const { data: abandonedData, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching abandoned checkouts:', error)
      return NextResponse.json({ error: 'Failed to fetch abandoned checkouts' }, { status: 500 })
    }

    // Get customer information for abandoned checkouts that have customer_id
    const customerIds = abandonedData?.filter(checkout => checkout.customer_id).map(checkout => checkout.customer_id.toString()) || []
    let customersData: any[] = []
    
    if (customerIds.length > 0) {
      const { data: customers, error: customerError } = await supabase
        .from('shopify_customers')
        .select('customer_id, first_name, last_name, email, phone, total_spent, orders_count, customer_segment')
        .in('customer_id', customerIds)
        .eq('connection_id', (abandonedData?.[0] as any)?.connection_id)

      if (!customerError && customers) {
        customersData = customers
      }
    }

    // Create a map of customer data by customer_id for quick lookup
    const customerMap = new Map<string, any>()
    customersData.forEach((customer: any) => {
      customerMap.set(customer.customer_id, customer)
    })

    // Merge customer data with abandoned checkout data
    const enrichedAbandonedData = abandonedData?.map(checkout => ({
      ...checkout,
      customer: checkout.customer_id ? customerMap.get(checkout.customer_id.toString()) || null : null
    })) || []

    // Calculate comprehensive metrics
    const totalAbandoned = enrichedAbandonedData?.length || 0
    const recoveredCheckouts = enrichedAbandonedData?.filter(checkout => checkout.recovered || checkout.completed_at) || []
    const totalRecovered = recoveredCheckouts.length
    const recoveryRate = totalAbandoned > 0 ? (totalRecovered / totalAbandoned) * 100 : 0
    
    const totalValue = enrichedAbandonedData?.reduce((sum, checkout) => sum + parseFloat(checkout.total_price || '0'), 0) || 0
    const recoveredValue = recoveredCheckouts.reduce((sum, checkout) => sum + parseFloat(checkout.total_price || '0'), 0) || 0
    const lostValue = totalValue - recoveredValue
    const averageValue = totalAbandoned > 0 ? totalValue / totalAbandoned : 0

    // Analyze products in abandoned carts
    const productStats = {} as Record<string, any>
    enrichedAbandonedData?.forEach(checkout => {
      if (checkout.line_items && Array.isArray(checkout.line_items)) {
        checkout.line_items.forEach((item: any) => {
          const productId = item.product_id?.toString()
          if (!productId) return

          if (!productStats[productId]) {
            productStats[productId] = {
              product_id: productId,
              title: item.title || 'Unknown Product',
              abandonment_count: 0,
              total_quantity: 0,
              total_value: 0,
              average_price: 0
            }
          }

          productStats[productId].abandonment_count += 1
          productStats[productId].total_quantity += parseInt(item.quantity || '0')
          productStats[productId].total_value += parseFloat(item.price || '0') * parseInt(item.quantity || '0')
        })
      }
    })

    // Calculate average prices for products
    const productArray = Object.values(productStats).map((product: any) => {
      product.average_price = product.total_quantity > 0 ? product.total_value / product.total_quantity : 0
      return product
    }).sort((a: any, b: any) => b.abandonment_count - a.abandonment_count)

    // Customer segmentation
    const customerSegments = {} as Record<string, any>
    enrichedAbandonedData?.forEach(checkout => {
      const segment = checkout.customer?.customer_segment || 'Unknown'
      if (!customerSegments[segment]) {
        customerSegments[segment] = {
          segment,
          count: 0,
          totalValue: 0,
          averageValue: 0
        }
      }
      customerSegments[segment].count += 1
      customerSegments[segment].totalValue += parseFloat(checkout.total_price || '0')
    })

    const segmentArray = Object.values(customerSegments).map((segment: any) => {
      segment.averageValue = segment.count > 0 ? segment.totalValue / segment.count : 0
      return segment
    }).sort((a: any, b: any) => b.totalValue - a.totalValue)

    // Group by location
    const locationStats = {} as Record<string, any>
    enrichedAbandonedData?.forEach(checkout => {
      const country = checkout.country || 'Unknown'
      const province = checkout.province || 'Unknown'
      const city = checkout.city || 'Unknown'
      const key = `${country}-${province}-${city}`
      
      if (!locationStats[key]) {
        locationStats[key] = {
          country,
          province,
          city,
          count: 0,
          totalValue: 0,
          averageValue: 0
        }
      }

      locationStats[key].count += 1
      locationStats[key].totalValue += parseFloat(checkout.total_price || '0')
    })

    // Calculate averages and convert to array
    const locationArray = Object.values(locationStats).map((location: any) => {
      location.averageValue = location.count > 0 ? location.totalValue / location.count : 0
      return location
    }).sort((a: any, b: any) => b.totalValue - a.totalValue)

    // Group by time period
    const timeStats = {} as Record<string, any>
    enrichedAbandonedData?.forEach(checkout => {
      const date = checkout.created_at?.split('T')[0]
      if (!date) return

      if (!timeStats[date]) {
        timeStats[date] = {
          date,
          count: 0,
          totalValue: 0,
          recovered: 0,
          recoveryRate: 0
        }
      }

      timeStats[date].count += 1
      timeStats[date].totalValue += parseFloat(checkout.total_price || '0')
      if (checkout.recovered || checkout.completed_at) {
        timeStats[date].recovered += 1
      }
    })

    const timeArray = Object.values(timeStats).map((day: any) => {
      day.recoveryRate = day.count > 0 ? (day.recovered / day.count) * 100 : 0
      return day
    }).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalAbandoned,
          totalRecovered,
          recoveryRate: Math.round(recoveryRate * 100) / 100,
          totalValue,
          recoveredValue,
          lostValue,
          averageValue,
          conversionOpportunity: lostValue * 0.15 // Estimate 15% recovery rate on remaining
        },
        byLocation: locationArray.slice(0, 10), // Top 10 locations
        byTime: timeArray,
        byProduct: productArray.slice(0, 10), // Top 10 most abandoned products
        byCustomerSegment: segmentArray,
        recentAbandoned: enrichedAbandonedData?.slice(0, 20).map(checkout => ({
          id: checkout.id,
          email: checkout.email,
          customer_name: checkout.customer ? 
            `${checkout.customer.first_name || ''} ${checkout.customer.last_name || ''}`.trim() : 
            'Guest',
          total_price: checkout.total_price,
          currency: checkout.currency,
          items_count: checkout.line_items?.length || 0,
          created_at: checkout.created_at,
          recovered: checkout.recovered || !!checkout.completed_at,
          abandoned_checkout_url: checkout.abandoned_checkout_url,
          customer_segment: checkout.customer?.customer_segment,
          customer_total_spent: checkout.customer?.total_spent,
          customer_orders_count: checkout.customer?.orders_count
        })) || []
      }
    })

  } catch (error) {
    console.error('Abandoned carts API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
