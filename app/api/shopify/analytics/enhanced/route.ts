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
    const timeRange = searchParams.get('timeRange') || '30d'

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    const supabase = createClient()

    // Get connection for this brand
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('id')
      .eq('platform_type', 'shopify')
      .eq('brand_id', brandId)
      .eq('user_id', userId)
      .single()

    if (connectionError || !connection) {
      return NextResponse.json({ error: 'No Shopify connection found for this brand' }, { status: 404 })
    }

    // Fetch all analytics data in parallel (excluding search analytics - not available via Shopify API)
    const [
      productAnalytics,
      customerJourney,
      contentPerformance,
      cartAnalytics
    ] = await Promise.all([
      getProductAnalytics(supabase, connection.id),
      getCustomerJourney(supabase, connection.id),
      getContentPerformance(supabase, connection.id),
      getCartAnalytics(supabase, connection.id)
    ])

    return NextResponse.json({
      productAnalytics,
      customerJourney,
      contentPerformance,
      cartAnalytics,
      timestamp: new Date().toISOString(),
      note: 'Search analytics not available - Shopify does not provide search data via API'
    })

  } catch (error) {
    console.error('Enhanced analytics fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}

async function getProductAnalytics(supabase: any, connectionId: string) {
  // Get the brand_id from the connection
  const { data: connection, error: connError } = await supabase
    .from('platform_connections')
    .select('brand_id, user_id')
    .eq('id', connectionId)
    .single()

  if (connError || !connection) throw new Error('Connection not found')

  // Query using brand_id and user_id for the existing table structure
  const { data, error } = await supabase
    .from('shopify_product_analytics')
    .select('*')
    .eq('brand_id', connection.brand_id)
    .eq('user_id', connection.user_id)
    .order('revenue', { ascending: false })
    .limit(20)

  if (error) throw error

  // If no data in existing table, return empty structure
  if (!data || data.length === 0) {
    return {
      products: [],
      summary: {
        totalRevenue: '0.00',
        avgConversionRate: '0.00',
        totalViews: 0,
        topPerformer: 'No data available'
      }
    }
  }

  // Calculate summary metrics
  const totalRevenue = data.reduce((sum: number, item: any) => sum + parseFloat(item.revenue || 0), 0)
  const avgConversionRate = data.reduce((sum: number, item: any) => sum + parseFloat(item.conversion_rate || 0), 0) / data.length
  const totalViews = data.reduce((sum: number, item: any) => sum + (item.views || 0), 0)

  return {
    products: data,
    summary: {
      totalRevenue: totalRevenue.toFixed(2),
      avgConversionRate: avgConversionRate.toFixed(2),
      totalViews,
      topPerformer: data[0]?.product_id?.toString() || 'N/A' // Use product_id since title might not exist
    }
  }
}

async function getCustomerJourney(supabase: any, connectionId: string) {
  const { data, error } = await supabase
    .from('shopify_customer_journey')
    .select('*')
    .eq('connection_id', connectionId)
    .order('conversion_timestamp', { ascending: false })
    .limit(100)

  if (error) throw error

  // Analyze journey patterns
  const touchPointAnalysis = data.reduce((acc: any, journey: any) => {
    const touchPoint = journey.first_touch_point || 'unknown'
    if (!acc[touchPoint]) {
      acc[touchPoint] = { count: 0, conversions: 0, revenue: 0 }
    }
    acc[touchPoint].count++
    if (journey.conversion_occurred) {
      acc[touchPoint].conversions++
      acc[touchPoint].revenue += parseFloat(journey.conversion_value || 0)
    }
    return acc
  }, {})

  const deviceAnalysis = data.reduce((acc: any, journey: any) => {
    const device = journey.device_type || 'unknown'
    if (!acc[device]) {
      acc[device] = { count: 0, conversions: 0 }
    }
    acc[device].count++
    if (journey.conversion_occurred) {
      acc[device].conversions++
    }
    return acc
  }, {})

  return {
    journeys: data.slice(0, 20), // Return top 20 for display
    touchPointAnalysis,
    deviceAnalysis,
    summary: {
      totalJourneys: data.length,
      conversionRate: ((data.filter((j: any) => j.conversion_occurred).length / data.length) * 100).toFixed(2),
      avgTimeSpent: (data.reduce((sum: number, j: any) => sum + (j.time_spent_seconds || 0), 0) / data.length / 60).toFixed(1) + ' min'
    }
  }
}

async function getContentPerformance(supabase: any, connectionId: string) {
  const { data, error } = await supabase
    .from('shopify_content_performance')
    .select('*')
    .eq('connection_id', connectionId)
    .order('page_views', { ascending: false })
    .limit(20)

  if (error) throw error

  const totalPageViews = data.reduce((sum: number, item: any) => sum + (item.page_views || 0), 0)
  const totalRevenue = data.reduce((sum: number, item: any) => sum + parseFloat(item.revenue || 0), 0)
  const avgBounceRate = data.reduce((sum: number, item: any) => sum + parseFloat(item.bounce_rate || 0), 0) / data.length

  return {
    content: data,
    summary: {
      totalPageViews,
      totalRevenue: totalRevenue.toFixed(2),
      avgBounceRate: avgBounceRate.toFixed(2) + '%',
      topContent: data[0]?.title || 'N/A'
    }
  }
}



async function getCartAnalytics(supabase: any, connectionId: string) {
  const { data, error } = await supabase
    .from('shopify_cart_analytics')
    .select('*')
    .eq('connection_id', connectionId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) throw error

  const totalCarts = data.length
  const convertedCarts = data.filter((cart: any) => cart.converted).length
  const abandonedCarts = data.filter((cart: any) => cart.abandoned).length
  const totalValue = data.reduce((sum: number, cart: any) => sum + parseFloat(cart.total_value || 0), 0)
  const avgCartValue = totalValue / totalCarts
  const conversionRate = (convertedCarts / totalCarts) * 100
  const abandonmentRate = (abandonedCarts / totalCarts) * 100

  return {
    carts: data.slice(0, 20), // Return top 20 for display
    summary: {
      totalCarts,
      conversionRate: conversionRate.toFixed(2) + '%',
      abandonmentRate: abandonmentRate.toFixed(2) + '%',
      avgCartValue: avgCartValue.toFixed(2),
      totalValue: totalValue.toFixed(2)
    }
  }
}
