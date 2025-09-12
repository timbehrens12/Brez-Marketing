import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const brandId = url.searchParams.get('brandId')

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID required' }, { status: 400 })
    }

    const supabase = createClient()

    // Check daily insights data
    const { data: insights, error: insightsError } = await supabase
      .from('meta_ad_daily_insights')
      .select('date, spend, impressions, clicks, created_at')
      .eq('brand_id', brandId)
      .order('date', { ascending: false })

    // Check campaigns data  
    const { data: campaigns, error: campaignsError } = await supabase
      .from('meta_campaigns')
      .select('name, spend, impressions, clicks, created_at')
      .eq('brand_id', brandId)

    // Check connection status
    const { data: connection, error: connError } = await supabase
      .from('platform_connections')
      .select('sync_status, last_sync_at, created_at')
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')
      .single()

    return NextResponse.json({
      success: true,
      brandId,
      connection: {
        status: connection?.sync_status || 'unknown',
        lastSync: connection?.last_sync_at || 'never',
        error: connError?.message || null
      },
      insights: {
        total: insights?.length || 0,
        error: insightsError?.message || null,
        dateRange: insights && insights.length > 0 ? {
          earliest: insights[insights.length - 1]?.date,
          latest: insights[0]?.date,
          totalDays: insights.length
        } : null,
        totalSpend: insights?.reduce((sum, insight) => sum + (insight.spend || 0), 0) || 0,
        sample: insights?.slice(0, 5) || []
      },
      campaigns: {
        total: campaigns?.length || 0,
        error: campaignsError?.message || null,
        totalSpend: campaigns?.reduce((sum, campaign) => sum + (campaign.spend || 0), 0) || 0,
        sample: campaigns?.slice(0, 3) || []
      }
    })

  } catch (error) {
    console.error('[Check Database] Error:', error)
    return NextResponse.json({
      error: 'Failed to check database',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
