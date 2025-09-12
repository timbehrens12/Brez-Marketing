import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { brandId } = await request.json()

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID required' }, { status: 400 })
    }

    console.log(`[Force Full Sync] Starting FULL 6-month sync for brand: ${brandId}`)

    // Get the active Meta connection
    const supabase = createClient()
    const { data: connection, error: connError } = await supabase
      .from('platform_connections')
      .select('id, access_token')
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')
      .eq('status', 'active')
      .single()

    if (connError || !connection) {
      return NextResponse.json({
        error: 'No active Meta connection found',
        details: connError?.message
      }, { status: 404 })
    }

    // Get account ID
    const accountsResponse = await fetch(`https://graph.facebook.com/v18.0/me/adaccounts?access_token=${connection.access_token}&fields=id,name`)
    const accountsData = await accountsResponse.json()
    const adAccountId = accountsData.data?.[0]?.id

    if (!adAccountId) {
      return NextResponse.json({
        error: 'Failed to get ad account ID',
        response: accountsData
      }, { status: 500 })
    }

    console.log(`[Force Full Sync] Using account: ${adAccountId}`)

    // FULL 6-month range - SAME AS WORKING API TEST
    const fullRange = {
      since: '2025-03-01',  // March 1st 
      until: '2025-09-12'   // Today
    }

    console.log(`[Force Full Sync] Syncing FULL range: ${fullRange.since} to ${fullRange.until}`)

    // Import and call the SAME methods as OAuth exchange
    const { DataBackfillService } = await import('@/lib/services/dataBackfillService')

    // Step 1: Sync campaigns
    console.log(`[Force Full Sync] Step 1: Syncing campaigns...`)
    await DataBackfillService.fetchMetaCampaigns(brandId, adAccountId, connection.access_token, fullRange)

    // Step 2: Sync daily insights
    console.log(`[Force Full Sync] Step 2: Syncing daily insights...`)
    await DataBackfillService.fetchMetaDailyInsights(brandId, adAccountId, connection.access_token, fullRange)

    console.log(`[Force Full Sync] ✅ FULL 6-month sync completed!`)

    // Update connection status
    await supabase
      .from('platform_connections')
      .update({
        sync_status: 'completed',
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', connection.id)

    // Check what we stored
    const { data: insights, error: insightsError } = await supabase
      .from('meta_ad_daily_insights')
      .select('date, spend, impressions, clicks')
      .eq('brand_id', brandId)
      .order('date', { ascending: false })
      .limit(30)

    const { data: campaigns, error: campaignsError } = await supabase
      .from('meta_campaigns')
      .select('name, spend, impressions, clicks')
      .eq('brand_id', brandId)
      .limit(10)

    return NextResponse.json({
      success: true,
      message: 'Full 6-month sync completed successfully',
      connectionId: connection.id,
      adAccountId,
      fullRange,
      storedData: {
        insights: {
          count: insights?.length || 0,
          error: insightsError?.message || null,
          sample: insights?.[0] || null,
          dateRange: insights ? {
            earliest: insights[insights.length - 1]?.date,
            latest: insights[0]?.date
          } : null
        },
        campaigns: {
          count: campaigns?.length || 0,
          error: campaignsError?.message || null,
          sample: campaigns?.[0] || null
        }
      }
    })

  } catch (error) {
    console.error('[Force Full Sync] Error:', error)
    return NextResponse.json({
      error: 'Force full sync failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const brandId = url.searchParams.get('brandId')
  
  if (!brandId) {
    return NextResponse.json({ error: 'Brand ID required' }, { status: 400 })
  }

  return POST(new NextRequest(request.url, {
    method: 'POST',
    body: JSON.stringify({ brandId }),
    headers: { 'content-type': 'application/json' }
  }))
}
