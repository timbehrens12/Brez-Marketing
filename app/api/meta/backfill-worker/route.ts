import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes (max on Pro plan)

/**
 * Dedicated worker endpoint for Meta 90-day backfill
 * This runs independently of the OAuth flow to avoid timeouts
 */
export async function POST(request: NextRequest) {
  try {
    const { brandId, connectionId } = await request.json()

    if (!brandId) {
      return NextResponse.json({ error: 'Missing brandId' }, { status: 400 })
    }

    console.log(`[Meta Backfill Worker] 🚀 Starting 90-day backfill for brand ${brandId}`)

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Calculate 90-day range
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 90)

    console.log(`[Meta Backfill Worker] 📅 Date range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`)

    // Import services
    const { fetchMetaAdInsights, fetchMetaCampaignBudgets, fetchMetaAdSets } = await import('@/lib/services/meta-service')

    // 1. Fetch campaigns
    console.log(`[Meta Backfill Worker] 📋 Fetching campaigns...`)
    const campaignsResult = await fetchMetaCampaignBudgets(brandId, true)
    const campaignCount = campaignsResult.budgets?.length || 0
    console.log(`[Meta Backfill Worker] ✅ Campaigns: ${campaignCount}`)

    // 2. Fetch adsets for each campaign (STAGGERED to avoid rate limits)
    console.log(`[Meta Backfill Worker] 📊 Fetching adsets for ${campaignCount} campaigns (90-day insights with staggered delays)...`)
    let totalAdsets = 0
    let rateLimitHit = false
    
    if (campaignsResult.success && campaignsResult.budgets) {
      for (let i = 0; i < campaignsResult.budgets.length; i++) {
        const campaign = campaignsResult.budgets[i]
        
        try {
          console.log(`[Meta Backfill Worker] 🔄 Processing campaign ${i + 1}/${campaignsResult.budgets.length}: ${campaign.campaign_id}`)
          
          // Pass date range to get 90 days of adset insights
          const adsetsResult = await fetchMetaAdSets(brandId, campaign.campaign_id, true, startDate, endDate)
          
          if (adsetsResult.success) {
            totalAdsets += adsetsResult.adSets?.length || 0
            console.log(`[Meta Backfill Worker] ✅ Campaign ${campaign.campaign_id}: ${adsetsResult.adSets?.length || 0} adsets fetched`)
          } else if (adsetsResult.error?.includes('rate limit')) {
            console.warn(`[Meta Backfill Worker] ⚠️ Rate limit hit for campaign ${campaign.campaign_id}`)
            rateLimitHit = true
            break // Stop if rate limited
          } else {
            console.warn(`[Meta Backfill Worker] ⚠️ Failed to fetch adsets for campaign ${campaign.campaign_id}:`, adsetsResult.error)
          }
        } catch (adsetError) {
          console.error(`[Meta Backfill Worker] ❌ Adset fetch error for campaign ${campaign.campaign_id}:`, adsetError)
        }
        
        // CRITICAL: Add 10-second delay between campaigns to stay under Meta's rate limit
        // Meta allows ~20 calls/min = 1 call every 3 seconds
        // Each campaign with 90-day insights = ~10-15 API calls
        // So we need ~10 seconds between campaigns to stay safe
        if (i < campaignsResult.budgets.length - 1) {
          console.log(`[Meta Backfill Worker] ⏳ Waiting 10 seconds before next campaign to avoid rate limits...`)
          await new Promise(resolve => setTimeout(resolve, 10000))
        }
      }
    }
    
    console.log(`[Meta Backfill Worker] ✅ Adsets: ${totalAdsets} (with 90-day insights)${rateLimitHit ? ' - INCOMPLETE due to rate limit' : ''}`)

    // Staged Fetching for Insights and Demographics
    let insightsResult = { success: false, count: 0, error: '' };
    let demographicsResult = { success: false, error: '' };

    // STAGE 3: Fetch ad-level insights only
    if (!rateLimitHit) {
      console.log(`[Meta Backfill Worker] ⏳ Waiting 30 seconds before fetching ad-level insights...`);
      await new Promise(resolve => setTimeout(resolve, 30000));

      console.log(`[Meta Backfill Worker] 📈 Fetching ad-level insights ONLY...`);
      try {
        insightsResult = await fetchMetaAdInsights(brandId, startDate, endDate, false, true, false); // skipDemographics = true, skipInsights = false
        if (!insightsResult.success && insightsResult.error?.includes('rate limit')) {
          console.warn(`[Meta Backfill Worker] ⚠️ Ad-level insights rate limited - sync will be incomplete.`);
          rateLimitHit = true;
        } else {
          console.log(`[Meta Backfill Worker] ✅ Ad-level insights fetched: ${insightsResult.count || 0} records`);
        }
      } catch (error) {
        console.error(`[Meta Backfill Worker] ❌ Insights fetch error:`, error);
        insightsResult = { success: false, count: 0, error: String(error) };
        rateLimitHit = true; // Assume failure means we should stop
      }
    }

    // STAGE 4: Fetch demographics only
    if (!rateLimitHit) {
      console.log(`[Meta Backfill Worker] ⏳ Waiting 30 seconds before fetching demographics...`);
      await new Promise(resolve => setTimeout(resolve, 30000));
      
      console.log(`[Meta Backfill Worker] 🌍 Fetching demographics ONLY...`);
      try {
        // We don't have a dedicated result for demographics, but we can check for success
        const demoSyncResult = await fetchMetaAdInsights(brandId, startDate, endDate, false, false, true); // skipDemographics = false, skipInsights = true
        if (!demoSyncResult.success && demoSyncResult.error?.includes('rate limit')) {
          console.warn(`[Meta Backfill Worker] ⚠️ Demographics rate limited - sync will be incomplete.`);
          rateLimitHit = true;
          demographicsResult = { success: false, error: demoSyncResult.error };
        } else {
          console.log(`[Meta Backfill Worker] ✅ Demographics sync initiated successfully.`);
          demographicsResult = { success: true, error: '' };
        }
      } catch (error) {
        console.error(`[Meta Backfill Worker] ❌ Demographics fetch error:`, error);
        demographicsResult = { success: false, error: String(error) };
        rateLimitHit = true;
      }
    }

    // Mark sync as completed
    if (connectionId) {
      const { data: existingConnection } = await supabase
        .from('platform_connections')
        .select('metadata')
        .eq('id', connectionId)
        .single()

      await supabase
        .from('platform_connections')
        .update({
          sync_status: rateLimitHit ? 'partial_success' : 'completed',
          last_synced_at: new Date().toISOString(),
          metadata: {
            ...(existingConnection?.metadata || {}),
            full_sync_in_progress: false,
            last_full_sync_completed_at: new Date().toISOString(),
            last_full_sync_result: `${rateLimitHit ? 'PARTIAL_' : ''}success_90_days: ${campaignCount} campaigns, ${totalAdsets} adsets, ${insightsResult?.count || 0} insights. Demographics sync ${demographicsResult.success ? 'succeeded' : 'failed'}.${rateLimitHit ? ' (rate limited - some data missing)' : ''}`,
            needs_manual_sync: rateLimitHit // Flag for UI to show "Complete Sync" button
          }
        })
        .eq('id', connectionId)
    }

    console.log(`[Meta Backfill Worker] 🎉 COMPLETE - Campaigns: ${campaignCount}, Adsets: ${totalAdsets}, Insights: ${insightsResult.count || 0}`)

    return NextResponse.json({
      success: true,
      campaigns: campaignCount,
      adsets: totalAdsets,
      insights: insightsResult.count || 0
    })

  } catch (error) {
    console.error('[Meta Backfill Worker] ❌ Error:', error)
    return NextResponse.json(
      { error: 'Backfill failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

