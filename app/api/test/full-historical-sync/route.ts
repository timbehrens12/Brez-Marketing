import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { brandId } = await request.json()

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID required' }, { status: 400 })
    }

    console.log(`[Full Historical Sync] Starting 6-month historical sync for brand: ${brandId}`)

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

    console.log(`[Full Historical Sync] Using account: ${adAccountId}, connection: ${connection.id}`)

    // Request 6 months of DAILY data (March 2025 to September 2025)
    const historicalInsightsUrl = `https://graph.facebook.com/v18.0/${adAccountId}/insights?` +
      `fields=spend,impressions,clicks,actions,action_values,ctr,cpm,date_start,date_stop&` +
      `time_range={"since":"2025-03-01","until":"2025-09-12"}&` +  // 6 months
      `time_increment=1&` +  // DAILY breakdown - this is key!
      `access_token=${connection.access_token}&limit=500`  // Higher limit for 6 months

    console.log(`[Full Historical Sync] Requesting 6 months of daily data...`)
    const historicalResponse = await fetch(historicalInsightsUrl)
    const historicalData = await historicalResponse.json()

    console.log(`[Full Historical Sync] Meta API returned:`, {
      count: historicalData.data?.length || 0,
      error: historicalData.error?.message || null,
      sample: historicalData.data?.[0] || null
    })

    let insightsInserted = 0
    let campaignsUpdated = 0

    if (historicalData.data && historicalData.data.length > 0) {
      console.log(`[Full Historical Sync] Processing ${historicalData.data.length} daily records...`)

      for (const insight of historicalData.data) {
        const actions = insight.actions || []
        const purchases = actions.find((action: any) => action.action_type === 'purchase')?.value || '0'
        const revenue = insight.action_values?.find((val: any) => val.action_type === 'purchase')?.value || '0'

        // Insert daily insight
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
          console.error(`[Full Historical Sync] Insight insert error for ${insight.date_start}:`, insightError)
        } else {
          insightsInserted++
          if (insightsInserted % 30 === 0) {
            console.log(`[Full Historical Sync] Processed ${insightsInserted} daily records...`)
          }
        }
      }
    }

    // Also get campaign-level historical data
    const campaignsUrl = `https://graph.facebook.com/v18.0/${adAccountId}/campaigns?` +
      `fields=id,name,status,objective,daily_budget,lifetime_budget,created_time,updated_time&` +
      `access_token=${connection.access_token}&limit=100`
    
    const campaignsResponse = await fetch(campaignsUrl)
    const campaignsData = await campaignsResponse.json()

    if (campaignsData.data && campaignsData.data.length > 0) {
      for (const campaign of campaignsData.data) {
        // Get historical insights for this specific campaign
        const campaignInsightsUrl = `https://graph.facebook.com/v18.0/${campaign.id}/insights?` +
          `fields=spend,impressions,clicks,actions,action_values,ctr,cpm&` +
          `time_range={"since":"2025-03-01","until":"2025-09-12"}&` +
          `access_token=${connection.access_token}`

        const campaignInsightsResponse = await fetch(campaignInsightsUrl)
        const campaignInsightsData = await campaignInsightsResponse.json()
        const campaignInsights = campaignInsightsData.data?.[0] || {}

        // Update campaign with historical totals
        const spend = parseFloat(campaignInsights.spend || '0')
        const impressions = parseInt(campaignInsights.impressions || '0')
        const clicks = parseInt(campaignInsights.clicks || '0')
        const actions = campaignInsights.actions || []
        const purchases = actions.find((action: any) => action.action_type === 'purchase')?.value || '0'

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
          ctr: parseFloat(campaignInsights.ctr || '0'),
          cpc: parseFloat(campaignInsights.cpm || '0'),
          created_time: campaign.created_time ? new Date(campaign.created_time) : new Date(),
          updated_time: campaign.updated_time ? new Date(campaign.updated_time) : new Date(),
          last_sync_time: new Date()
        }

        const { error: campaignError } = await supabase
          .from('meta_campaigns')
          .upsert(campaignData, {
            onConflict: 'campaign_id,brand_id'
          })

        if (!campaignError) {
          campaignsUpdated++
          console.log(`[Full Historical Sync] Updated campaign: ${campaign.name} (${spend} spend, ${impressions} impressions)`)
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    return NextResponse.json({
      success: true,
      message: `Full 6-month historical sync completed!`,
      results: {
        insightsInserted,
        campaignsUpdated,
        dateRange: '2025-03-01 to 2025-09-12',
        connectionId: connection.id,
        adAccountId
      }
    })

  } catch (error) {
    console.error('[Full Historical Sync] Error:', error)
    return NextResponse.json({
      error: 'Full historical sync failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
