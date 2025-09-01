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
    const brandId = searchParams.get('brandId')

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    // Check Meta connection
    const { data: connection } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')
      .eq('status', 'active')
      .single()

    if (!connection) {
      return NextResponse.json({ 
        error: 'No active Meta connection found',
        debug: { brandId, hasConnection: false }
      }, { status: 404 })
    }

    // Check for Meta campaigns
    const { data: campaigns, count: campaignCount } = await supabase
      .from('meta_campaigns')
      .select('id, name, spent', { count: 'exact' })
      .eq('brand_id', brandId)
      .limit(5)

    // Check for Meta ad insights
    const { data: insights, count: insightsCount } = await supabase
      .from('meta_ad_insights')
      .select('id, ad_name, impressions, spend', { count: 'exact' })
      .eq('brand_id', brandId)
      .limit(5)

    // Check for demographic data
    const { data: demographics, count: demoCount } = await supabase
      .from('meta_demographics')
      .select('*', { count: 'exact' })
      .eq('connection_id', connection.id)
      .limit(5)

    // Check for device data
    const { data: deviceData, count: deviceCount } = await supabase
      .from('meta_device_performance')
      .select('*', { count: 'exact' })
      .eq('connection_id', connection.id)
      .limit(5)

    return NextResponse.json({
      success: true,
      debug: {
        brandId,
        connectionId: connection.id,
        hasConnection: true,
        campaignCount,
        insightsCount,
        demoCount,
        deviceCount,
        sampleCampaigns: campaigns?.slice(0, 3),
        sampleInsights: insights?.slice(0, 3),
        sampleDemographics: demographics?.slice(0, 3),
        sampleDeviceData: deviceData?.slice(0, 3),
        connectionDetails: {
          id: connection.id,
          platform_type: connection.platform_type,
          status: connection.status,
          created_at: connection.created_at,
          updated_at: connection.updated_at
        }
      }
    })

  } catch (error) {
    console.error('Error in Meta debug API:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
