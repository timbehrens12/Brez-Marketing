import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const brandId = '0da80e8f-2df3-468d-9053-08fa4d24e6e8'
    const supabase = createClient()
    
    console.log('[Check Meta Data] Checking what data exists in database')
    
    // Check meta_ad_daily_insights table
    const { data: adInsights, error: adError } = await supabase
      .from('meta_ad_daily_insights')
      .select('date, spent, impressions, clicks, reach, ad_id')
      .eq('brand_id', brandId)
      .order('date', { ascending: false })
      .limit(20)
    
    console.log('[Check Meta Data] meta_ad_daily_insights results:', adInsights)
    console.log('[Check Meta Data] meta_ad_daily_insights error:', adError)
    
    // Check meta_campaign_daily_stats table  
    const { data: campaignStats, error: campaignError } = await supabase
      .from('meta_campaign_daily_stats')
      .select('date, spend, impressions, clicks, reach')
      .eq('brand_id', brandId)
      .order('date', { ascending: false })
      .limit(20)
    
    console.log('[Check Meta Data] meta_campaign_daily_stats results:', campaignStats)
    console.log('[Check Meta Data] meta_campaign_daily_stats error:', campaignError)
    
    // Calculate totals
    const adInsightsTotal = adInsights?.reduce((sum, item) => sum + (parseFloat(item.spent) || 0), 0) || 0
    const campaignStatsTotal = campaignStats?.reduce((sum, item) => sum + (parseFloat(item.spend) || 0), 0) || 0
    
    return NextResponse.json({
      success: true,
      brandId,
      tables: {
        meta_ad_daily_insights: {
          recordCount: adInsights?.length || 0,
          totalSpent: adInsightsTotal,
          dateRange: adInsights?.length > 0 ? `${adInsights[adInsights.length-1]?.date} to ${adInsights[0]?.date}` : 'No data',
          sampleRecords: adInsights?.slice(0, 3) || [],
          error: adError
        },
        meta_campaign_daily_stats: {
          recordCount: campaignStats?.length || 0,
          totalSpend: campaignStatsTotal,
          dateRange: campaignStats?.length > 0 ? `${campaignStats[campaignStats.length-1]?.date} to ${campaignStats[0]?.date}` : 'No data',
          sampleRecords: campaignStats?.slice(0, 3) || [],
          error: campaignError
        }
      },
      analysis: {
        whichTableHasMoreData: adInsightsTotal > campaignStatsTotal ? 'meta_ad_daily_insights' : 'meta_campaign_daily_stats',
        dashboardShouldQuery: 'meta_ad_daily_insights',
        expectedDashboardValue: adInsightsTotal
      }
    })

  } catch (error) {
    console.error('[Check Meta Data] Error:', error)
    return NextResponse.json({ 
      error: 'Failed to check Meta data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
