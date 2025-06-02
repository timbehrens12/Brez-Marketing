import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

/**
 * API endpoint to check for data gaps in Meta Ads data for a specific date
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const brandId = url.searchParams.get('brandId')
    const date = url.searchParams.get('date') // Format: YYYY-MM-DD
    
    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    console.log(`[Meta Data Check] Checking for data gaps on ${date} for brand ${brandId}`)
    
    // First, check if we have Meta connection
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('id')
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')
      .eq('status', 'active')
      .single()
      
    if (connectionError || !connection) {
      return NextResponse.json({ 
        hasGap: false, 
        reason: 'No active Meta connection found'
      })
    }
    
    // Check if we have data in meta_ad_insights for this date
    const { data: insights, error: insightsError } = await supabase
      .from('meta_ad_insights')
      .select('id')
      .eq('brand_id', brandId)
      .eq('date', date)
      .limit(10) // Just need to check if any data exists
      
    if (insightsError) {
      console.error(`[Meta Data Check] Error checking insights:`, insightsError)
      return NextResponse.json({ error: 'Failed to check data' }, { status: 500 })
    }
    
    // Check daily campaign insights
    const { data: campaignInsights, error: campaignError } = await supabase
      .from('meta_campaign_daily_insights')
      .select('*')
      .eq('brand_id', brandId)
      .eq('date', date)
      .limit(10)
      
    if (campaignError) {
      console.error(`[Meta Data Check] Error checking campaign insights:`, campaignError)
    }
    
    // Also check the last sync history to see if the data might be stale
    const { data: syncHistory, error: syncError } = await supabase
      .from('meta_sync_history')
      .select('*')
      .eq('brand_id', brandId)
      .order('synced_at', { ascending: false })
      .limit(1)
      
    if (syncError) {
      console.error(`[Meta Data Check] Error checking sync history:`, syncError)
    }
    
    // Determine if there's a gap based on checks
    const hasInsights = insights && insights.length > 0
    const hasCampaignInsights = campaignInsights && campaignInsights.length > 0
    
    // Data quality score based on presence of data in different tables
    const dataQualityScore = (hasInsights ? 50 : 0) + (hasCampaignInsights ? 50 : 0)
    
    // We consider data to have a gap if we have less than 75% of expected data
    const hasGap = dataQualityScore < 75
    
    if (hasGap) {
      console.log(`[Meta Data Check] Gap detected for ${date}: Quality score ${dataQualityScore}%`)
    } else {
      console.log(`[Meta Data Check] No gap detected for ${date}: Quality score ${dataQualityScore}%`)
    }
    
    return NextResponse.json({
      hasGap,
      date,
      hasInsights,
      hasCampaignInsights,
      dataQualityScore,
      lastSync: syncHistory && syncHistory.length > 0 ? syncHistory[0].synced_at : null
    })
  } catch (error) {
    console.error('[Meta Data Check] Server error:', error)
    return NextResponse.json({ 
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 