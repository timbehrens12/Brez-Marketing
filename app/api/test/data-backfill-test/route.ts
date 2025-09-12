import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DataBackfillService } from '@/lib/services/dataBackfillService'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const brandId = searchParams.get('brandId')

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID required' }, { status: 400 })
    }

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

    console.log(`[Data Backfill Test] Testing with connection: ${connection.id}`)

    // Get account ID
    const meResponse = await fetch(`https://graph.facebook.com/v18.0/me/adaccounts?access_token=${connection.access_token}&fields=id,name,account_status`)
    const meData = await meResponse.json()
    const adAccountId = meData.data?.[0]?.id

    if (!adAccountId) {
      return NextResponse.json({
        error: 'Failed to get ad account ID',
        response: meData
      }, { status: 500 })
    }

    console.log(`[Data Backfill Test] Found ad account: ${adAccountId}`)

    // Test date range
    const dateRange = {
      since: '2024-08-01',
      until: '2024-09-11'
    }

    console.log(`[Data Backfill Test] Testing date range: ${dateRange.since} to ${dateRange.until}`)

    try {
      // Test campaign fetching
      console.log(`[Data Backfill Test] Calling fetchMetaCampaigns...`)
      await DataBackfillService.fetchMetaCampaigns(brandId, adAccountId, connection.access_token, dateRange)
      console.log(`[Data Backfill Test] fetchMetaCampaigns completed`)
    } catch (campaignError) {
      console.error(`[Data Backfill Test] fetchMetaCampaigns failed:`, campaignError)
    }

    try {
      // Test insights fetching
      console.log(`[Data Backfill Test] Calling fetchMetaDailyInsights...`)
      await DataBackfillService.fetchMetaDailyInsights(brandId, adAccountId, connection.access_token, dateRange)
      console.log(`[Data Backfill Test] fetchMetaDailyInsights completed`)
    } catch (insightsError) {
      console.error(`[Data Backfill Test] fetchMetaDailyInsights failed:`, insightsError)
    }

    return NextResponse.json({
      success: true,
      message: 'Data backfill test completed - check Vercel logs for detailed output',
      connectionId: connection.id,
      adAccountId,
      dateRange,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[Data Backfill Test] Error:', error)
    return NextResponse.json({
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
