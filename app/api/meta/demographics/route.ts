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
    const breakdownType = searchParams.get('breakdownType') || 'age' // Default to age
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
      .from('meta_demographics')
      .select('*')
      .eq('connection_id', connectionId)
      .eq('breakdown_type', breakdownType)
      .order('breakdown_value')

    // Apply date range filter using flexible overlap logic
    if (dateRangeStart && dateRangeEnd) {
      query = query
        .gte('date_range_start', dateRangeStart)
        .lte('date_range_start', dateRangeEnd)
      console.log(`[Demographics API] 🔥 Using flexible date range filter: ${dateRangeStart} to ${dateRangeEnd}`)
    } else {
      console.log(`[Demographics API] 🔥 No date range provided, fetching all data`)
    }

    console.log(`[Demographics API] 🔥 Query params: { connectionId: '${connectionId}', breakdownType: '${breakdownType}', dateRangeStart: '${dateRangeStart}', dateRangeEnd: '${dateRangeEnd}' }`)

    const { data: demographics, error } = await query

    console.log(`[Demographics API] 🔥 Query result: ${demographics?.length || 0} records found`)
    console.log(`[Demographics API] 🔥 Raw records sample:`, demographics?.slice(0, 3))
    if (demographics?.length === 0) {
      // Debug: Check if ANY data exists for this connection
      const { data: allData } = await supabase
        .from('meta_demographics')
        .select('*')
        .eq('connection_id', connectionId)
        .limit(5)
      console.log(`[Demographics API] 🔥 ALL DATA for connectionId ${connectionId}:`, {
        count: allData?.length || 0,
        sample: allData?.slice(0, 2),
        allConnectionIds: allData?.map(d => d.connection_id)
      })
      
      // Also check what connection IDs actually exist in the table
      const { data: allConnections } = await supabase
        .from('meta_demographics')
        .select('connection_id, count(*)')
        .limit(5)
      console.log(`[Demographics API] 🔥 ALL CONNECTION IDS in meta_demographics:`, allConnections)
    }

    if (error) {
      console.error('Error fetching Meta demographics:', error)
      return NextResponse.json({ error: 'Failed to fetch demographic data' }, { status: 500 })
    }

    // Aggregate data by breakdown_value
    const aggregatedData = demographics.reduce((acc: any, record: any) => {
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

    console.log(`[Demographics API] 🔥 Aggregated result:`, result)
    console.log(`[Demographics API] 🔥 Aggregation summary: ${demographics?.length || 0} raw records → ${result.length} aggregated records`)
    console.log(`[Demographics API] 🔥 Total aggregated spend: $${result.reduce((sum, item) => sum + item.spend, 0).toFixed(2)}`)
    console.log(`[Demographics API] 🔥 Total aggregated impressions: ${result.reduce((sum, item) => sum + item.impressions, 0)}`)

    return NextResponse.json({
      success: true,
      data: result,
      breakdown_type: breakdownType,
      total_records: demographics.length
    })

  } catch (error) {
    console.error('Error in Meta demographics API:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
