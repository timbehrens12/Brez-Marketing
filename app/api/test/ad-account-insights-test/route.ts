import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

    console.log(`[Ad Account Insights Test] Found connection: ${connection.id}`)

    // Get ad account
    const accountsResponse = await fetch(`https://graph.facebook.com/v18.0/me/adaccounts?access_token=${connection.access_token}&fields=id,name`)
    const accountsData = await accountsResponse.json()

    if (!accountsResponse.ok || !accountsData.data?.[0]) {
      return NextResponse.json({
        error: 'Failed to get ad accounts',
        response: accountsData
      }, { status: 500 })
    }

    const adAccountId = accountsData.data[0].id
    console.log(`[Ad Account Insights Test] Found ad account: ${adAccountId}`)

    // Test AD ACCOUNT insights request (same as fetchMetaDailyInsights uses)
    const insightsUrl = `https://graph.facebook.com/v18.0/${adAccountId}/insights?fields=spend,impressions,clicks,actions,action_values,ctr,cpm,date_start,date_stop&access_token=${connection.access_token}&limit=100`
    const insightsResponse = await fetch(insightsUrl)
    const insightsData = await insightsResponse.json()

    console.log(`[Ad Account Insights Test] Insights response:`, JSON.stringify(insightsData, null, 2))

    // Try to extract the data
    const insights = insightsData.data || []
    console.log(`[Ad Account Insights Test] Number of insights:`, insights.length)

    if (insights.length > 0) {
      const firstInsight = insights[0]
      console.log(`[Ad Account Insights Test] First insight keys:`, Object.keys(firstInsight))

      const spend = parseFloat(firstInsight.spend || '0')
      const impressions = parseInt(firstInsight.impressions || '0')
      const clicks = parseInt(firstInsight.clicks || '0')

      console.log(`[Ad Account Insights Test] Extracted data:`, {
        spend,
        impressions,
        clicks,
        hasSpend: 'spend' in firstInsight,
        spendValue: firstInsight.spend,
        insightsKeys: Object.keys(firstInsight)
      })
    }

    return NextResponse.json({
      success: true,
      adAccountId,
      insightsCount: insights.length,
      firstInsight: insights[0] || null,
      hasSpend: insights.length > 0 ? 'spend' in insights[0] : false
    })

  } catch (error) {
    console.error('[Ad Account Insights Test] Error:', error)
    return NextResponse.json({
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
