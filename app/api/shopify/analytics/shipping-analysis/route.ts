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

    // Get orders with shipping data
    let ordersQuery = supabase
      .from('shopify_orders')
      .select('id, total_price, shipping_lines, created_at')
      .eq('brand_id', brandId)

    if (from) {
      ordersQuery = ordersQuery.gte('created_at', from)
    }
    if (to) {
      ordersQuery = ordersQuery.lte('created_at', to)
    }

    const { data: ordersData, error: ordersError } = await ordersQuery

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
    const addressMap = new Map()
    addressData?.forEach(addr => {
      addressMap.set(parseInt(addr.order_id), addr)
    })

    // Process shipping data from orders
    const shippingData = ordersData?.map(order => {
      const address = addressMap.get(order.id)
      const shippingLines = order.shipping_lines || []
      let totalShippingCost = 0
      let shippingZone = 'Standard'
      
      // Extract shipping cost from shipping_lines JSON
      if (Array.isArray(shippingLines) && shippingLines.length > 0) {
        totalShippingCost = shippingLines.reduce((sum: number, line: any) => {
          return sum + parseFloat(line.price || '0')
        }, 0)
        shippingZone = shippingLines[0]?.title || 'Standard'
      }

      return {
        total_orders: 1,
        total_shipping_cost: totalShippingCost.toString(),
        total_order_value: order.total_price,
        shipping_zone: shippingZone,
        country: address?.country || 'Unknown',
        province: address?.province || 'Unknown',
        city: address?.city || 'Unknown',
        delivery_time_avg_days: 5, // Default estimate
        on_time_delivery_rate: 85, // Default estimate
        date_period: order.created_at
      }
    }).filter(order => order.country !== 'Unknown') || []

    // Calculate shipping cost trends
    const totalOrders = shippingData?.reduce((sum, record) => sum + (record.total_orders || 0), 0) || 0
    const totalShippingCost = shippingData?.reduce((sum, record) => sum + parseFloat(record.total_shipping_cost || '0'), 0) || 0
    const totalOrderValue = shippingData?.reduce((sum, record) => sum + parseFloat(record.total_order_value || '0'), 0) || 0

    // Group by shipping zone
    const zoneStats = shippingData?.reduce((acc, record) => {
      const zone = record.shipping_zone || 'Unknown'
      if (!acc[zone]) {
        acc[zone] = {
          zone,
          orders: 0,
          shippingCost: 0,
          orderValue: 0,
          avgShippingCost: 0,
          shippingPercentage: 0
        }
      }

      acc[zone].orders += record.total_orders || 0
      acc[zone].shippingCost += parseFloat(record.total_shipping_cost || '0')
      acc[zone].orderValue += parseFloat(record.total_order_value || '0')

      return acc
    }, {} as Record<string, any>) || {}

    // Calculate averages and percentages
    Object.values(zoneStats).forEach((zone: any) => {
      zone.avgShippingCost = zone.orders > 0 ? zone.shippingCost / zone.orders : 0
      zone.shippingPercentage = zone.orderValue > 0 ? (zone.shippingCost / zone.orderValue) * 100 : 0
    })

    const zoneArray = Object.values(zoneStats)
      .sort((a: any, b: any) => b.shippingCost - a.shippingCost)

    // Group by location for geographic analysis
    const locationStats = shippingData?.reduce((acc, record) => {
      const location = `${record.country || 'Unknown'}, ${record.province || 'Unknown'}`
      if (!acc[location]) {
        acc[location] = {
          location,
          orders: 0,
          shippingCost: 0,
          avgDeliveryTime: 0,
          onTimeRate: 0
        }
      }

      acc[location].orders += record.total_orders || 0
      acc[location].shippingCost += parseFloat(record.total_shipping_cost || '0')
      acc[location].avgDeliveryTime = record.delivery_time_avg_days || 0
      acc[location].onTimeRate = record.on_time_delivery_rate || 0

      return acc
    }, {} as Record<string, any>) || {}

    const locationArray = Object.values(locationStats)
      .sort((a: any, b: any) => b.orders - a.orders)
      .slice(0, 8) // Top 8 locations

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalOrders,
          totalShippingCost,
          averageShippingCost: totalOrders > 0 ? totalShippingCost / totalOrders : 0,
          shippingCostPercentage: totalOrderValue > 0 ? (totalShippingCost / totalOrderValue) * 100 : 0
        },
        byZone: zoneArray,
        byLocation: locationArray,
        dailyTrends: shippingData?.slice(0, 30) || [] // Last 30 days
      }
    })

  } catch (error) {
    console.error('Shipping analytics API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
