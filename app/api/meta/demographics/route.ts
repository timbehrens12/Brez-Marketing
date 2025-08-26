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
    const fromDate = searchParams.get('from')
    const toDate = searchParams.get('to')

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    const supabase = createClient()

    // Get Meta platform connection for this brand
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

    const connectionId = connection.id

    // Set default date range if not provided (last 30 days)
    const defaultToDate = new Date().toISOString().split('T')[0]
    const defaultFromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    const startDate = fromDate || defaultFromDate
    const endDate = toDate || defaultToDate

    // Fetch demographic data
    const { data: ageData } = await supabase
      .from('meta_demographics')
      .select('*')
      .eq('connection_id', connectionId)
      .eq('breakdown_type', 'age')
      .gte('date_range_start', startDate)
      .lte('date_range_end', endDate)

    const { data: genderData } = await supabase
      .from('meta_demographics')
      .select('*')
      .eq('connection_id', connectionId)
      .eq('breakdown_type', 'gender')
      .gte('date_range_start', startDate)
      .lte('date_range_end', endDate)

    const { data: ageGenderData } = await supabase
      .from('meta_demographics')
      .select('*')
      .eq('connection_id', connectionId)
      .eq('breakdown_type', 'age_gender')
      .gte('date_range_start', startDate)
      .lte('date_range_end', endDate)

    // Fetch device performance data
    const { data: deviceData } = await supabase
      .from('meta_device_performance')
      .select('*')
      .eq('connection_id', connectionId)
      .eq('breakdown_type', 'device')
      .gte('date_range_start', startDate)
      .lte('date_range_end', endDate)

    const { data: placementData } = await supabase
      .from('meta_device_performance')
      .select('*')
      .eq('connection_id', connectionId)
      .eq('breakdown_type', 'placement')
      .gte('date_range_start', startDate)
      .lte('date_range_end', endDate)

    const { data: platformData } = await supabase
      .from('meta_device_performance')
      .select('*')
      .eq('connection_id', connectionId)
      .eq('breakdown_type', 'platform')
      .gte('date_range_start', startDate)
      .lte('date_range_end', endDate)

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

    console.log(`[Meta Demographics API] Data gathered for brand ${brandId}:`, {
      ageGroups: demographics.age.length,
      genderData: demographics.gender.length,
      deviceTypes: devicePerformance.device.length,
      placements: devicePerformance.placement.length,
      platforms: devicePerformance.platform.length,
      dateRange: `${startDate} to ${endDate}`
    })

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