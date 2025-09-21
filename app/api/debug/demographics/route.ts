import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const brandId = searchParams.get('brandId')
    
    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Check meta_demographics table
    const { data: demographicsData, error: demographicsError } = await supabase
      .from('meta_demographics')
      .select('*')
      .eq('brand_id', brandId)
      .order('date_range_start', { ascending: false })
      .limit(20)

    // Check meta_device_performance table
    const { data: deviceData, error: deviceError } = await supabase
      .from('meta_device_performance')
      .select('*')
      .eq('brand_id', brandId)
      .order('date_range_start', { ascending: false })
      .limit(20)

    // Get table schemas
    const { data: demographicsSchema } = await supabase
      .from('meta_demographics')
      .select('*')
      .limit(0)

    const { data: deviceSchema } = await supabase
      .from('meta_device_performance')
      .select('*')
      .limit(0)

    // Count records by breakdown type
    const { data: demographicsCount } = await supabase
      .from('meta_demographics')
      .select('breakdown_type, date_range_start, date_range_end')
      .eq('brand_id', brandId)

    const { data: deviceCount } = await supabase
      .from('meta_device_performance')
      .select('breakdown_type, date_range_start, date_range_end')
      .eq('brand_id', brandId)

    const demographicsGrouped = demographicsCount?.reduce((acc, item) => {
      const key = `${item.breakdown_type}:${item.date_range_start}-${item.date_range_end}`
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    const deviceGrouped = deviceCount?.reduce((acc, item) => {
      const key = `${item.breakdown_type}:${item.date_range_start}-${item.date_range_end}`
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    return NextResponse.json({
      success: true,
      brandId,
      demographics: {
        total_records: demographicsData?.length || 0,
        breakdown_counts: demographicsGrouped,
        sample_records: demographicsData?.slice(0, 5) || [],
        error: demographicsError?.message
      },
      device: {
        total_records: deviceData?.length || 0,
        breakdown_counts: deviceGrouped,
        sample_records: deviceData?.slice(0, 5) || [],
        error: deviceError?.message
      },
      date_ranges: {
        demographics: [...new Set(demographicsCount?.map(d => `${d.date_range_start} to ${d.date_range_end}`))],
        device: [...new Set(deviceCount?.map(d => `${d.date_range_start} to ${d.date_range_end}`))]
      }
    })

  } catch (error) {
    console.error('Debug demographics error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}
