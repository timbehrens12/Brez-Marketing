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

    console.log(`[Simple Meta Test] Found connection: ${connection.id}`)

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
    console.log(`[Simple Meta Test] Found ad account: ${adAccountId}`)

    // Test campaigns request (same as dataBackfillService)
    const campaignsUrl = `https://graph.facebook.com/v18.0/${adAccountId}/campaigns?fields=id,name,status,objective,daily_budget,lifetime_budget,created_time,updated_time&access_token=${connection.access_token}&limit=2`
    const campaignsResponse = await fetch(campaignsUrl)
    const campaignsData = await campaignsResponse.json()

    console.log(`[Simple Meta Test] Campaigns response:`, JSON.stringify(campaignsData, null, 2))

    if (!campaignsResponse.ok || !campaignsData.data?.[0]) {
      return NextResponse.json({
        error: 'Failed to get campaigns',
        response: campaignsData
      }, { status: 500 })
    }

    const campaign = campaignsData.data[0]
    console.log(`[Simple Meta Test] Testing campaign: ${campaign.id}`)

    // Test insights request (same as dataBackfillService)
    const insightsUrl = `https://graph.facebook.com/v18.0/${campaign.id}/insights?fields=spend,impressions,clicks,actions,action_values,ctr,cpm,cpp&access_token=${connection.access_token}&limit=100`
    const insightsResponse = await fetch(insightsUrl)
    const insightsData = await insightsResponse.json()

    console.log(`[Simple Meta Test] Insights response:`, JSON.stringify(insightsData, null, 2))

    // Try to extract the data
    const insights = insightsData.data?.[0] || {}
    console.log(`[Simple Meta Test] First insight keys:`, Object.keys(insights))

    const spend = parseFloat(insights.spend || '0')
    const impressions = parseInt(insights.impressions || '0')
    const clicks = parseInt(insights.clicks || '0')

    console.log(`[Simple Meta Test] Extracted data:`, {
      spend,
      impressions,
      clicks,
      hasSpend: 'spend' in insights,
      spendValue: insights.spend,
      insightsKeys: Object.keys(insights)
    })

    return NextResponse.json({
      success: true,
      campaign: {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status
      },
      insights: {
        count: insightsData.data?.length || 0,
        first: insights,
        extracted: {
          spend,
          impressions,
          clicks,
          hasSpend: 'spend' in insights
        }
      }
    })

  } catch (error) {
    console.error('[Simple Meta Test] Error:', error)
    return NextResponse.json({
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
