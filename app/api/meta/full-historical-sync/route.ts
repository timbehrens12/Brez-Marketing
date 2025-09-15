import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * FULL HISTORICAL SYNC - Get ALL Meta data like it used to work
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[Full Historical Sync] 🚀 Starting COMPLETE historical sync...')

    const { brandId } = await request.json()
    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID required' }, { status: 400 })
    }

    const supabase = createClient()
    
    // Get the active Meta connection
    const { data: connection } = await supabase
      .from('platform_connections')
      .select('id, access_token, metadata')
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')
      .eq('status', 'active')
      .single()

    if (!connection || !connection.access_token) {
      return NextResponse.json({
        success: false,
        error: 'No active Meta connection found'
      })
    }

    console.log(`[Full Historical Sync] Using connection: ${connection.id}`)

    // Get account ID from Meta API
    const accountsResponse = await fetch(`https://graph.facebook.com/v18.0/me/adaccounts?access_token=${connection.access_token}&fields=id,name`)
    const accountsData = await accountsResponse.json()
    
    if (!accountsData.data || accountsData.data.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No Meta ad accounts found'
      })
    }

    const adAccountId = accountsData.data[0].id
    console.log(`[Full Historical Sync] Using account: ${adAccountId}`)

    // Import the data backfill service to do FULL historical sync
    const { DataBackfillService } = await import('@/lib/services/dataBackfillService')

    // Set date range to get ALL data (full 12 months)
    const endDate = new Date()
    const startDate = new Date()
    startDate.setMonth(endDate.getMonth() - 12) // Full 12 months back

    const dateRange = {
      since: startDate.toISOString().split('T')[0],
      until: endDate.toISOString().split('T')[0]
    }

    console.log(`[Full Historical Sync] Syncing from ${dateRange.since} to ${dateRange.until}`)

    let totalCampaigns = 0
    let totalInsights = 0
    let errors = []

    try {
      // 1. Fetch ALL campaigns with insights
      console.log('[Full Historical Sync] 📊 Fetching ALL campaigns...')
      await DataBackfillService.fetchMetaCampaigns(brandId, adAccountId, connection.access_token, dateRange)
      
      // Count campaigns
      const { data: campaigns } = await supabase
        .from('meta_campaigns')
        .select('id')
        .eq('brand_id', brandId)
      
      totalCampaigns = campaigns?.length || 0
      console.log(`[Full Historical Sync] ✅ Campaigns synced: ${totalCampaigns}`)

    } catch (campaignError) {
      console.error('[Full Historical Sync] ❌ Campaign sync error:', campaignError)
      errors.push(`Campaign sync: ${campaignError.message}`)
    }

    try {
      // 2. Fetch ALL daily insights (this gets the bulk of your data)
      console.log('[Full Historical Sync] 📈 Fetching ALL daily insights...')
      await DataBackfillService.fetchMetaDailyInsights(brandId, adAccountId, connection.access_token, dateRange)
      
      // Count insights
      const { data: insights } = await supabase
        .from('meta_ad_daily_insights')
        .select('id')
        .eq('brand_id', brandId)
      
      totalInsights = insights?.length || 0
      console.log(`[Full Historical Sync] ✅ Daily insights synced: ${totalInsights}`)

    } catch (insightsError) {
      console.error('[Full Historical Sync] ❌ Insights sync error:', insightsError)
      errors.push(`Insights sync: ${insightsError.message}`)
    }

    // Update connection status
    await supabase
      .from('platform_connections')
      .update({
        sync_status: 'completed',
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', connection.id)

    console.log(`[Full Historical Sync] 🎉 COMPLETE! Campaigns: ${totalCampaigns}, Insights: ${totalInsights}`)

    return NextResponse.json({
      success: true,
      message: 'Full historical sync completed',
      results: {
        totalCampaigns,
        totalInsights,
        dateRange,
        errors: errors.length > 0 ? errors : null
      },
      action: 'check_dashboard'
    })

  } catch (error) {
    console.error('[Full Historical Sync] ❌ Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Full sync failed',
      details: error.message
    }, { status: 500 })
  }
}
