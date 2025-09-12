import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const brandId = url.searchParams.get('brandId') || '1a30f34b-b048-4f80-b880-6c61bd12c720'
    
    const supabase = createClient()

    // Check meta_ad_daily_insights
    const { data: dailyInsights, error: dailyError } = await supabase
      .from('meta_ad_daily_insights')
      .select('date, ad_id, spent')
      .eq('brand_id', brandId)
      .order('date', { ascending: false })
      .limit(10)

    // Check meta_campaign_daily_stats  
    const { data: campaignStats, error: campaignError } = await supabase
      .from('meta_campaign_daily_stats')
      .select('date, campaign_id, spend')
      .eq('brand_id', brandId)
      .order('date', { ascending: false })
      .limit(10)

    // Check meta_campaigns
    const { data: campaigns, error: campaignsError } = await supabase
      .from('meta_campaigns')
      .select('campaign_id, campaign_name, spent')
      .eq('brand_id', brandId)

    // Call the metrics API
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://www.brezmarketingdashboard.com'
    const metricsResponse = await fetch(`${baseUrl}/api/metrics/meta?brandId=${brandId}&from=2025-09-12&to=2025-09-12`)
    const metricsData = metricsResponse.ok ? await metricsResponse.json() : { error: 'Failed to fetch' }

    return NextResponse.json({
      success: true,
      brandId,
      data: {
        meta_ad_daily_insights: {
          count: dailyInsights?.length || 0,
          data: dailyInsights,
          error: dailyError
        },
        meta_campaign_daily_stats: {
          count: campaignStats?.length || 0,
          data: campaignStats,
          error: campaignError
        },
        meta_campaigns: {
          count: campaigns?.length || 0,
          data: campaigns,
          error: campaignsError
        },
        metrics_api_response: metricsData
      }
    })
  } catch (error) {
    console.error('Debug doubling error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
