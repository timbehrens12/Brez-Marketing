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
    const connectionId = searchParams.get('connectionId')
    const fromDate = searchParams.get('from')
    const toDate = searchParams.get('to')
    const dateRangeStart = searchParams.get('dateRangeStart')
    const dateRangeEnd = searchParams.get('dateRangeEnd')
    const breakdownType = searchParams.get('breakdownType')

    // Support both new format (brandId) and legacy format (connectionId)
    if (!brandId && !connectionId) {
      return NextResponse.json({ error: 'Brand ID or Connection ID is required' }, { status: 400 })
    }

    const supabase = createClient()

    let finalConnectionId: string

    if (connectionId) {
      // Legacy format - connectionId provided directly
      finalConnectionId = connectionId
    } else {
      // New format - brandId provided, need to look up connectionId
      const { data: connection } = await supabase
        .from('platform_connections')
        .select('id')
        .eq('brand_id', brandId)
        .eq('platform_type', 'meta')
        .eq('status', 'active')
        .single()

      if (!connection) {
        console.log('No Meta connection found for brand')
        return NextResponse.json({ 
          demographics: { age: [], gender: [], ageGender: [] },
          devicePerformance: { device: [], placement: [], platform: [] },
          insights: {},
          success: true
        })
      }

      finalConnectionId = connection.id
    }

    // Set default date range if not provided (last 30 days)
    const defaultToDate = new Date().toISOString().split('T')[0]
    const defaultFromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    // Support both date formats
    const startDate = fromDate || dateRangeStart || defaultFromDate
    const endDate = toDate || dateRangeEnd || defaultToDate

    // If breakdownType is specified (legacy format), filter by that specific type
    let ageData = null, genderData = null, ageGenderData = null
    let deviceData = null, placementData = null, platformData = null

    if (breakdownType) {
      // Legacy format - fetch only specific breakdown type
      if (breakdownType === 'age') {
        const { data } = await supabase
          .from('meta_demographics')
          .select('*')
          .eq('connection_id', finalConnectionId)
          .eq('breakdown_type', 'age')
          .gte('date_range_start', startDate)
          .lte('date_range_end', endDate)
        ageData = data
      } else if (breakdownType === 'gender') {
        const { data } = await supabase
          .from('meta_demographics')
          .select('*')
          .eq('connection_id', finalConnectionId)
          .eq('breakdown_type', 'gender')
          .gte('date_range_start', startDate)
          .lte('date_range_end', endDate)
        genderData = data
      } else if (breakdownType === 'age_gender') {
        const { data } = await supabase
          .from('meta_demographics')
          .select('*')
          .eq('connection_id', finalConnectionId)
          .eq('breakdown_type', 'age_gender')
          .gte('date_range_start', startDate)
          .lte('date_range_end', endDate)
        ageGenderData = data
      } else if (breakdownType === 'device') {
        const { data } = await supabase
          .from('meta_device_performance')
          .select('*')
          .eq('connection_id', finalConnectionId)
          .eq('breakdown_type', 'device')
          .gte('date_range_start', startDate)
          .lte('date_range_end', endDate)
        deviceData = data
      } else if (breakdownType === 'placement') {
        const { data } = await supabase
          .from('meta_device_performance')
          .select('*')
          .eq('connection_id', finalConnectionId)
          .eq('breakdown_type', 'placement')
          .gte('date_range_start', startDate)
          .lte('date_range_end', endDate)
        placementData = data
      } else if (breakdownType === 'platform') {
        const { data } = await supabase
          .from('meta_device_performance')
          .select('*')
          .eq('connection_id', finalConnectionId)
          .eq('breakdown_type', 'platform')
          .gte('date_range_start', startDate)
          .lte('date_range_end', endDate)
        platformData = data
      }
    } else {
      // New format - fetch all demographic and device data
      const [ageResult, genderResult, ageGenderResult, deviceResult, placementResult, platformResult] = await Promise.all([
        supabase
          .from('meta_demographics')
          .select('*')
          .eq('connection_id', finalConnectionId)
          .eq('breakdown_type', 'age')
          .gte('date_range_start', startDate)
          .lte('date_range_end', endDate),
        supabase
          .from('meta_demographics')
          .select('*')
          .eq('connection_id', finalConnectionId)
          .eq('breakdown_type', 'gender')
          .gte('date_range_start', startDate)
          .lte('date_range_end', endDate),
        supabase
          .from('meta_demographics')
          .select('*')
          .eq('connection_id', finalConnectionId)
          .eq('breakdown_type', 'age_gender')
          .gte('date_range_start', startDate)
          .lte('date_range_end', endDate),
        supabase
          .from('meta_device_performance')
          .select('*')
          .eq('connection_id', finalConnectionId)
          .eq('breakdown_type', 'device')
          .gte('date_range_start', startDate)
          .lte('date_range_end', endDate),
        supabase
          .from('meta_device_performance')
          .select('*')
          .eq('connection_id', finalConnectionId)
          .eq('breakdown_type', 'placement')
          .gte('date_range_start', startDate)
          .lte('date_range_end', endDate),
        supabase
          .from('meta_device_performance')
          .select('*')
          .eq('connection_id', finalConnectionId)
          .eq('breakdown_type', 'platform')
          .gte('date_range_start', startDate)
          .lte('date_range_end', endDate)
      ])

      ageData = ageResult.data
      genderData = genderResult.data
      ageGenderData = ageGenderResult.data
      deviceData = deviceResult.data
      placementData = placementResult.data
      platformData = platformResult.data
    }

    // Aggregate demographic insights
    const demographics = {
      age: ageData || [],
      gender: genderData || [],
      ageGender: ageGenderData || []
    }

    // Aggregate device performance insights
    const devicePerformance = {
      device: deviceData || [],
      placement: placementData || [],
      platform: platformData || []
    }

    // Calculate insights for AI analysis
    const insights = {
      topAgeGroups: demographics.age
        .sort((a: any, b: any) => b.impressions - a.impressions)
        .slice(0, 5)
        .map((item: any) => ({ 
          age: item.breakdown_value, 
          impressions: item.impressions, 
          spend: item.spend,
          ctr: item.ctr,
          conversions: item.conversions 
        })),
      
      genderDistribution: demographics.gender
        .map((item: any) => ({ 
          gender: item.breakdown_value, 
          impressions: item.impressions, 
          spend: item.spend, 
          ctr: item.ctr,
          conversions: item.conversions 
        })),
      
      topDevices: devicePerformance.device
        .sort((a: any, b: any) => b.impressions - a.impressions)
        .slice(0, 5)
        .map((item: any) => ({ 
          device: item.breakdown_value, 
          impressions: item.impressions, 
          ctr: item.ctr,
          spend: item.spend,
          conversions: item.conversions 
        })),
      
      bestPlacements: devicePerformance.placement
        .sort((a: any, b: any) => b.ctr - a.ctr)
        .slice(0, 5)
        .map((item: any) => ({ 
          placement: item.breakdown_value, 
          ctr: item.ctr, 
          spend: item.spend,
          impressions: item.impressions,
          conversions: item.conversions 
        })),
      
      platformBreakdown: devicePerformance.platform
        .map((item: any) => ({ 
          platform: item.breakdown_value, 
          impressions: item.impressions, 
          spend: item.spend, 
          ctr: item.ctr,
          conversions: item.conversions 
        }))
    }

    console.log(`[Meta Demographics API] Data gathered:`, {
      ageGroups: demographics.age.length,
      genderData: demographics.gender.length,
      deviceTypes: devicePerformance.device.length,
      placements: devicePerformance.placement.length,
      platforms: devicePerformance.platform.length,
      dateRange: `${startDate} to ${endDate}`,
      breakdownType: breakdownType || 'all',
      connectionId: finalConnectionId
    })

    // If breakdownType is specified (legacy format), return just that data in the old format
    if (breakdownType) {
      let responseData = []
      if (breakdownType === 'age') responseData = ageData || []
      else if (breakdownType === 'gender') responseData = genderData || []
      else if (breakdownType === 'age_gender') responseData = ageGenderData || []
      else if (breakdownType === 'device') responseData = deviceData || []
      else if (breakdownType === 'placement') responseData = placementData || []
      else if (breakdownType === 'platform') responseData = platformData || []

      return NextResponse.json(responseData)
    }

    // New format - return comprehensive data
    return NextResponse.json({
      demographics,
      devicePerformance,
      insights,
      success: true,
      dateRange: { from: startDate, to: endDate }
    })

  } catch (error) {
    console.error('Error fetching Meta demographics data:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch demographics data',
      demographics: { age: [], gender: [], ageGender: [] },
      devicePerformance: { device: [], placement: [], platform: [] },
      insights: {},
      success: false
    }, { status: 500 })
  }
}