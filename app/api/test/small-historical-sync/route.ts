import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { brandId } = await request.json()

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID required' }, { status: 400 })
    }

    console.log(`[Small Historical Sync] Testing 30-day historical sync for brand: ${brandId}`)

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

    console.log(`[Small Historical Sync] Using account: ${adAccountId}`)

    // Test smaller range - 30 days to avoid timeout
    const testRange = {
      since: '2025-08-13',  // 30 days ago
      until: '2025-09-12'   // Today
    }

    console.log(`[Small Historical Sync] Testing range: ${testRange.since} to ${testRange.until}`)

    // Import and call the FIXED sync methods
    const { DataBackfillService } = await import('@/lib/services/dataBackfillService')

    console.log(`[Small Historical Sync] Step 1: Syncing daily insights with FIXED column names...`)
    await DataBackfillService.fetchMetaDailyInsights(brandId, adAccountId, connection.access_token, testRange)

    console.log(`[Small Historical Sync] ✅ Sync completed! Checking database...`)

    // Check what we stored
    const { data: insights, error: insightsError } = await supabase
      .from('meta_ad_daily_insights')
      .select('date, spent, impressions, clicks, created_at')
      .eq('brand_id', brandId)
      .order('date', { ascending: false })

    return NextResponse.json({
      success: true,
      message: 'Small historical sync completed successfully',
      connectionId: connection.id,
      adAccountId,
      testRange,
      beforeFix: {
        description: "Before fix: only 3 days (Sep 9,10,11) with $2.86"
      },
      afterFix: {
        totalDays: insights?.length || 0,
        totalSpend: insights?.reduce((sum, insight) => sum + parseFloat(insight.spent || '0'), 0) || 0,
        dateRange: insights && insights.length > 0 ? {
          earliest: insights[insights.length - 1]?.date,
          latest: insights[0]?.date
        } : null,
        sample: insights?.slice(0, 5) || [],
        error: insightsError?.message || null
      }
    })

  } catch (error) {
    console.error('[Small Historical Sync] Error:', error)
    return NextResponse.json({
      error: 'Small historical sync failed',
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
