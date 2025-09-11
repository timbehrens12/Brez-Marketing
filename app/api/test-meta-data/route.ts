import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const brandId = '0da80e8f-2df3-468d-9053-08fa4d24e6e8'
    
    const supabase = createClient()
    
    // Check what data exists in meta_ad_daily_insights
    const { data: adInsights, error: adError } = await supabase
      .from('meta_ad_daily_insights')
      .select('date, spent')
      .eq('brand_id', brandId)
      .order('date', { ascending: true })

    if (adError) {
      return NextResponse.json({ error: adError.message }, { status: 500 })
    }

    // Check what data exists in meta_campaign_daily_stats  
    const { data: campaignStats, error: campaignError } = await supabase
      .from('meta_campaign_daily_stats')
      .select('date, spend')
      .eq('brand_id', brandId)
      .order('date', { ascending: true })

    const adTotal = adInsights?.reduce((sum, item) => sum + (parseFloat(item.spent) || 0), 0) || 0
    const campaignTotal = campaignStats?.reduce((sum, item) => sum + (parseFloat(item.spend) || 0), 0) || 0

    return NextResponse.json({
      success: true,
      brandId,
      adInsights: {
        count: adInsights?.length || 0,
        total: adTotal,
        dateRange: adInsights?.length ? `${adInsights[0].date} to ${adInsights[adInsights.length - 1].date}` : 'No data',
        sample: adInsights?.slice(0, 3)
      },
      campaignStats: {
        count: campaignStats?.length || 0,
        total: campaignTotal,
        dateRange: campaignStats?.length ? `${campaignStats[0].date} to ${campaignStats[campaignStats.length - 1].date}` : 'No data',
        sample: campaignStats?.slice(0, 3)
      },
      recommendation: adTotal > campaignTotal ? 'Dashboard should use meta_ad_daily_insights' : 'Dashboard should use meta_campaign_daily_stats'
    })
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
