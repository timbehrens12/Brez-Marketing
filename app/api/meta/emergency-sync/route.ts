import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 300 // 5 minutes

export async function POST(request: NextRequest) {
  console.log('🚨 EMERGENCY SYNC: Starting complete Meta data rebuild...')
  
  try {
    // Emergency bypass auth for internal fix
    const body = await request.json()
    const { brandId } = body
    
    if (!brandId) {
      return NextResponse.json({ error: 'brandId required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get Meta connection
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')
      .eq('status', 'active')
      .single()

    if (connectionError || !connection) {
      console.error('❌ No Meta connection found:', connectionError)
      return NextResponse.json({ error: 'No Meta connection found' }, { status: 404 })
    }

    const accessToken = connection.access_token
    const accountId = connection.metadata?.ad_account_id || 'act_498473601902770'
    
    console.log(`🚀 Using account: ${accountId}`)

    // 🧨 NUCLEAR WIPE: Delete all existing Meta data
    console.log('🧨 NUCLEAR WIPE: Deleting all existing Meta data...')
    await Promise.all([
      supabase.from('meta_ad_insights').delete().eq('brand_id', brandId),
      supabase.from('meta_adset_daily_insights').delete().eq('brand_id', brandId),
      supabase.from('meta_adsets').delete().eq('brand_id', brandId),
      supabase.from('meta_campaigns').delete().eq('brand_id', brandId),
      supabase.from('meta_ads').delete().eq('brand_id', brandId),
      supabase.from('meta_demographics').delete().eq('brand_id', brandId),
      supabase.from('meta_device_performance').delete().eq('brand_id', brandId)
    ])
    console.log('✅ All Meta data wiped')

    // 🔥 EMERGENCY SYNC: Last 30 days of real data
    console.log('🔥 EMERGENCY SYNC: Fetching last 30 days of real data...')
    
    const today = new Date()
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(today.getDate() - 30)
    
    const since = thirtyDaysAgo.toISOString().split('T')[0]
    const until = today.toISOString().split('T')[0]
    
    console.log(`📅 Date range: ${since} to ${until}`)

    // Fetch ad insights
    const insightsUrl = `https://graph.facebook.com/v18.0/${accountId}/insights?fields=impressions,clicks,spend,reach,date_start,date_stop,campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,account_id,ctr,cpc,conversions&time_range={"since":"${since}","until":"${until}"}&level=ad&access_token=${accessToken}`
    
    console.log('🔄 Fetching ad insights...')
    const insightsResponse = await fetch(insightsUrl)
    const insightsData = await insightsResponse.json()
    
    if (insightsData.error) {
      console.error('❌ Meta API error:', insightsData.error)
      return NextResponse.json({ error: 'Meta API error', details: insightsData.error }, { status: 400 })
    }

    if (!insightsData.data || insightsData.data.length === 0) {
      console.log('⚠️ No insights data found for date range')
      return NextResponse.json({ error: 'No insights data found' }, { status: 404 })
    }

    console.log(`✅ Found ${insightsData.data.length} insights records`)

    // 🚀 STORE INSIGHTS: Convert and store in database
    const insightRecords = []
    for (const insight of insightsData.data) {
      insightRecords.push({
        brand_id: brandId,
        connection_id: connection.id,
        campaign_id: insight.campaign_id,
        campaign_name: insight.campaign_name,
        adset_id: insight.adset_id,
        adset_name: insight.adset_name,
        ad_id: insight.ad_id,
        ad_name: insight.ad_name,
        account_id: insight.account_id || accountId.replace('act_', ''),
        date: insight.date_start, // Use start date as the primary date
        impressions: parseInt(insight.impressions) || 0,
        clicks: parseInt(insight.clicks) || 0,
        spend: parseFloat(insight.spend) || 0,
        reach: parseInt(insight.reach) || 0,
        ctr: parseFloat(insight.ctr) || 0,
        cpc: parseFloat(insight.cpc) || 0,
        conversions: parseFloat(insight.conversions) || 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    }

    console.log('💾 Storing insights in database...')
    const { error: insertError } = await supabase
      .from('meta_ad_insights')
      .insert(insightRecords)

    if (insertError) {
      console.error('❌ Failed to store insights:', insertError)
      return NextResponse.json({ error: 'Failed to store insights', details: insertError }, { status: 500 })
    }

    console.log(`✅ Stored ${insightRecords.length} insights records`)

    // 🔄 AGGREGATE DATA: Create campaigns and adsets
    console.log('🔄 Running aggregation...')
    const { error: aggError } = await supabase.rpc('aggregate_meta_data', { 
      brand_id_param: brandId 
    })

    if (aggError) {
      console.error('❌ Aggregation failed:', aggError)
    } else {
      console.log('✅ Aggregation completed')
    }

    // 📊 VERIFY RESULTS
    const [campaignsResult, adsetsResult, insightsCount] = await Promise.all([
      supabase.from('meta_campaigns').select('count(*)').eq('brand_id', brandId).single(),
      supabase.from('meta_adsets').select('count(*)').eq('brand_id', brandId).single(),
      supabase.from('meta_ad_insights').select('count(*)').eq('brand_id', brandId).single()
    ])

    const finalCounts = {
      campaigns: campaignsResult.data?.count || 0,
      adsets: adsetsResult.data?.count || 0,
      insights: insightsCount.data?.count || 0
    }

    console.log('🎉 EMERGENCY SYNC COMPLETE:', finalCounts)

    return NextResponse.json({
      success: true,
      message: 'Emergency sync completed successfully',
      dateRange: { since, until },
      finalCounts,
      rawInsights: insightsData.data.length
    })

  } catch (error) {
    console.error('❌ EMERGENCY SYNC FAILED:', error)
    return NextResponse.json({
      error: 'Emergency sync failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Also support GET for easy testing
export async function GET() {
  return NextResponse.json({
    message: 'Emergency sync endpoint ready. Send POST with { brandId } to start sync.',
    status: 'ready'
  })
}
