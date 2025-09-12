import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { brandId } = await request.json()

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID required' }, { status: 400 })
    }

    console.log(`[Force Meta Sync] Starting NUCLEAR sync for brand: ${brandId}`)

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

    console.log(`[Force Meta Sync] Using account: ${adAccountId}, connection: ${connection.id}`)

    // Get campaigns
    const campaignsUrl = `https://graph.facebook.com/v18.0/${adAccountId}/campaigns?fields=id,name,status,objective,daily_budget,lifetime_budget,created_time,updated_time&access_token=${connection.access_token}&limit=100`
    const campaignsResponse = await fetch(campaignsUrl)
    const campaignsData = await campaignsResponse.json()

    console.log(`[Force Meta Sync] Found ${campaignsData.data?.length || 0} campaigns`)

    let campaignsInserted = 0
    let insightsInserted = 0

    if (campaignsData.data && campaignsData.data.length > 0) {
      for (const campaign of campaignsData.data) {
        // Get campaign insights (NO DATE RANGE - this is key!)
        const insightsUrl = `https://graph.facebook.com/v18.0/${campaign.id}/insights?fields=spend,impressions,clicks,actions,action_values,ctr,cpm&access_token=${connection.access_token}&limit=100`
        const insightsResponse = await fetch(insightsUrl)
        const insightsData = await insightsResponse.json()

        const insights = insightsData.data?.[0] || {}
        console.log(`[Force Meta Sync] Campaign ${campaign.name} insights:`, Object.keys(insights))

        // Extract metrics safely
        const spend = parseFloat(insights.spend || '0')
        const impressions = parseInt(insights.impressions || '0')
        const clicks = parseInt(insights.clicks || '0')
        const actions = insights.actions || []
        const purchases = actions.find((action: any) => action.action_type === 'purchase')?.value || '0'

        // Insert campaign with CORRECT schema
        const campaignData = {
          campaign_id: campaign.id,
          brand_id: brandId,
          connection_id: connection.id,
          account_id: adAccountId,
          campaign_name: campaign.name,
          status: campaign.status,
          objective: campaign.objective,
          budget: campaign.daily_budget ? parseFloat(campaign.daily_budget) / 100 : campaign.lifetime_budget ? parseFloat(campaign.lifetime_budget) / 100 : null,
          budget_type: campaign.daily_budget ? 'daily' : campaign.lifetime_budget ? 'lifetime' : 'unknown',
          spent: spend,
          impressions: impressions,
          clicks: clicks,
          conversions: parseInt(purchases),
          ctr: parseFloat(insights.ctr || '0'),
          cpc: parseFloat(insights.cpm || '0'),
          created_time: campaign.created_time ? new Date(campaign.created_time) : new Date(),
          updated_time: campaign.updated_time ? new Date(campaign.updated_time) : new Date(),
          last_sync_time: new Date()
        }

        const { error: campaignError } = await supabase
          .from('meta_campaigns')
          .upsert(campaignData, {
            onConflict: 'campaign_id,brand_id'
          })

        if (campaignError) {
          console.error(`[Force Meta Sync] Campaign insert error:`, campaignError)
        } else {
          campaignsInserted++
          console.log(`[Force Meta Sync] ✅ Inserted campaign: ${campaign.name}`)
        }
      }
    }

    // Get account-level insights for historical data (NO DATE RANGE)
    const accountInsightsUrl = `https://graph.facebook.com/v18.0/${adAccountId}/insights?fields=spend,impressions,clicks,actions,action_values,ctr,cpm,date_start,date_stop&access_token=${connection.access_token}&limit=100`
    const accountInsightsResponse = await fetch(accountInsightsUrl)
    const accountInsightsData = await accountInsightsResponse.json()

    console.log(`[Force Meta Sync] Found ${accountInsightsData.data?.length || 0} account insights`)

    if (accountInsightsData.data && accountInsightsData.data.length > 0) {
      for (const insight of accountInsightsData.data) {
        const actions = insight.actions || []
        const purchases = actions.find((action: any) => action.action_type === 'purchase')?.value || '0'
        const revenue = insight.action_values?.find((val: any) => val.action_type === 'purchase')?.value || '0'

        const { error: insightError } = await supabase
          .from('meta_ad_daily_insights')
          .upsert({
            brand_id: brandId,
            date: insight.date_start,
            spend: parseFloat(insight.spend || '0'),
            impressions: parseInt(insight.impressions || '0'),
            clicks: parseInt(insight.clicks || '0'),
            purchases: parseInt(purchases),
            revenue: parseFloat(revenue),
            ctr: parseFloat(insight.ctr || '0'),
            cpm: parseFloat(insight.cpm || '0'),
            created_at: new Date().toISOString()
          }, {
            onConflict: 'brand_id,date'
          })

        if (insightError) {
          console.error(`[Force Meta Sync] Insight insert error:`, insightError)
        } else {
          insightsInserted++
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'NUCLEAR Meta sync completed - bypassed all caching!',
      results: {
        campaignsInserted,
        insightsInserted,
        connectionId: connection.id,
        adAccountId
      }
    })

  } catch (error) {
    console.error('[Force Meta Sync] Error:', error)
    return NextResponse.json({
      error: 'Nuclear sync failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
