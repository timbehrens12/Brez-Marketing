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

    // Get orders with date filtering 
    let ordersQuery = supabase
      .from('shopify_orders')
      .select('id, total_price, created_at, customer_id, customer_email')
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
      .select('order_id, city, province, province_code, country, country_code')
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

    // Create regional data by combining orders with addresses
    const regionalData = ordersData?.map(order => {
      const address = addressMap.get(order.id)
      return {
        ...order,
        country: address?.country || 'Unknown',
        province: address?.province || 'Unknown',
        city: address?.city || 'Unknown',
        country_code: address?.country_code || '',
        province_code: address?.province_code || '',
        total_price: order.total_price,
        order_count: 1,
        created_at: order.created_at
      }
    }).filter(order => order.country !== 'Unknown') || []

    // Group by country
    const countryStats = regionalData?.reduce((acc, record) => {
      const country = record.country || 'Unknown'
      if (!acc[country]) {
        acc[country] = {
          country,
          revenue: 0,
          orders: 0,
          avgOrderValue: 0,
          provinces: new Set()
        }
      }

      acc[country].revenue += parseFloat(record.total_price || '0')
      acc[country].orders += record.order_count || 1
      if (record.province) {
        acc[country].provinces.add(record.province)
      }

      return acc
    }, {} as Record<string, any>) || {}

    // Calculate averages and convert Set to count
    Object.values(countryStats).forEach((country: any) => {
      country.avgOrderValue = country.orders > 0 ? country.revenue / country.orders : 0
      country.provinceCount = country.provinces.size
      delete country.provinces // Remove Set object for JSON serialization
    })

    const countryArray = Object.values(countryStats)
      .sort((a: any, b: any) => b.revenue - a.revenue)

    // Group by province/state
    const provinceStats = regionalData?.reduce((acc, record) => {
      const province = `${record.province || 'Unknown'}, ${record.country || 'Unknown'}`
      if (!acc[province]) {
        acc[province] = {
          province: record.province || 'Unknown',
          country: record.country || 'Unknown',
          revenue: 0,
          orders: 0,
          avgOrderValue: 0,
          cities: new Set()
        }
      }

      acc[province].revenue += parseFloat(record.total_price || '0')
      acc[province].orders += record.order_count || 1
      if (record.city) {
        acc[province].cities.add(record.city)
      }

      return acc
    }, {} as Record<string, any>) || {}

    // Calculate province averages
    Object.values(provinceStats).forEach((province: any) => {
      province.avgOrderValue = province.orders > 0 ? province.revenue / province.orders : 0
      province.cityCount = province.cities.size
      delete province.cities
    })

    const provinceArray = Object.values(provinceStats)
      .sort((a: any, b: any) => b.revenue - a.revenue)
      .slice(0, 10) // Top 10 provinces

    // City-level analysis
    const cityStats = regionalData?.reduce((acc, record) => {
      const city = `${record.city || 'Unknown'}, ${record.province || 'Unknown'}, ${record.country || 'Unknown'}`
      if (!acc[city]) {
        acc[city] = {
          city: record.city || 'Unknown',
          province: record.province || 'Unknown',
          country: record.country || 'Unknown',
          revenue: 0,
          orders: 0,
          avgOrderValue: 0
        }
      }

      acc[city].revenue += parseFloat(record.total_price || '0')
      acc[city].orders += record.order_count || 1

      return acc
    }, {} as Record<string, any>) || {}

    Object.values(cityStats).forEach((city: any) => {
      city.avgOrderValue = city.orders > 0 ? city.revenue / city.orders : 0
    })

    const cityArray = Object.values(cityStats)
      .sort((a: any, b: any) => b.revenue - a.revenue)
      .slice(0, 10) // Top 10 cities

    // Calculate overall totals
    const totalRevenue = regionalData?.reduce((sum, r) => sum + parseFloat(r.total_price || '0'), 0) || 0
    const totalOrders = regionalData?.reduce((sum, r) => sum + (r.order_count || 1), 0) || 0

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalRevenue,
          totalOrders,
          averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
          uniqueCountries: countryArray.length,
          uniqueProvinces: provinceArray.length,
          uniqueCities: cityArray.length
        },
        byCountry: countryArray,
        byProvince: provinceArray,
        byCity: cityArray,
        performanceMap: regionalData?.map(record => ({
          country: record.country,
          province: record.province,
          city: record.city,
          countryCode: record.country_code,
          provinceCode: record.province_code,
          revenue: parseFloat(record.total_price || '0'),
          orders: record.order_count || 1,
          date: record.created_at
        })) || []
      }
    })

  } catch (error) {
    console.error('Regional sales API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
