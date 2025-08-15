import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs'

export async function GET(request: NextRequest) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const connectionId = searchParams.get('connectionId')
    const breakdownType = searchParams.get('breakdownType') || 'device' // Default to device
    const dateRangeStart = searchParams.get('dateRangeStart')
    const dateRangeEnd = searchParams.get('dateRangeEnd')

    if (!connectionId) {
      return NextResponse.json({ error: 'Connection ID is required' }, { status: 400 })
    }

    // Verify user has access to this connection through brand access
    const { data: connection } = await supabase
      .from('platform_connections')
      .select(`
        id,
        brand_id,
        brands!inner (
          id,
          user_id
        )
      `)
      .eq('id', connectionId)
      .eq('platform_type', 'meta')
      .single()

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
    }

    // Check if user owns the brand or has access through brand_access
    const { data: brandAccess } = await supabase
      .from('brand_access')
      .select('id')
      .eq('brand_id', connection.brand_id)
      .eq('user_id', userId)
      .single()

    const isOwner = connection.brands.user_id === userId
    const hasAccess = brandAccess?.id

    if (!isOwner && !hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Build the query
    let query = supabase
      .from('meta_device_performance')
      .select('*')
      .eq('connection_id', connectionId)
      .eq('breakdown_type', breakdownType)
      .order('breakdown_value')

    // Add date range filter if provided
    if (dateRangeStart && dateRangeEnd) {
      query = query
        .gte('date_range_start', dateRangeStart)
        .lte('date_range_end', dateRangeEnd)
    }

    const { data: devicePerformance, error } = await query

    console.log(`[Device Performance API] 🔥 Query params:`, {
      connectionId,
      breakdownType,
      dateRangeStart,
      dateRangeEnd,
      resultCount: devicePerformance?.length || 0
    })

    if (error) {
      console.error('Error fetching Meta device performance:', error)
      return NextResponse.json({ error: 'Failed to fetch device performance data' }, { status: 500 })
    }

    if (breakdownType === 'placement') {
      console.log(`[Device Performance API] 🔥 PLACEMENT QUERY RESULT:`, devicePerformance?.slice(0, 3))
      
      // Also check what placement data exists without date filtering
      const { data: allPlacements } = await supabase
        .from('meta_device_performance')
        .select('*')
        .eq('connection_id', connectionId)
        .eq('breakdown_type', 'placement')
        .order('date_range_start', { ascending: false })
        .limit(10)
      
      console.log(`[Device Performance API] 🔥 ALL PLACEMENT DATA (no date filter):`, {
        count: allPlacements?.length || 0,
        sample: allPlacements?.slice(0, 3),
        dateRanges: allPlacements?.map(p => `${p.date_range_start} to ${p.date_range_end}`)
      })
    }

    // Aggregate data by breakdown_value
    const aggregatedData = devicePerformance.reduce((acc: any, record: any) => {
      const key = record.breakdown_value
      if (!acc[key]) {
        acc[key] = {
          breakdown_value: key,
          impressions: 0,
          clicks: 0,
          spend: 0,
          reach: 0,
          total_records: 0
        }
      }
      
      acc[key].impressions += record.impressions || 0
      acc[key].clicks += record.clicks || 0
      acc[key].spend += parseFloat(record.spend || '0')
      acc[key].reach += record.reach || 0
      acc[key].total_records += 1
      
      return acc
    }, {})

    // Convert to array and calculate averages for rate metrics
    const result = Object.values(aggregatedData).map((item: any) => ({
      ...item,
      cpm: item.impressions > 0 ? (item.spend / item.impressions * 1000) : 0,
      cpc: item.clicks > 0 ? (item.spend / item.clicks) : 0,
      ctr: item.impressions > 0 ? (item.clicks / item.impressions * 100) : 0,
      spend: parseFloat(item.spend.toFixed(2))
    }))

    return NextResponse.json({
      success: true,
      data: result,
      breakdown_type: breakdownType,
      total_records: devicePerformance.length
    })

  } catch (error) {
    console.error('Error in Meta device performance API:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
