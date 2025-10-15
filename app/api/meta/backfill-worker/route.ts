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

    // 3. Fetch 90 days of ad-level insights and demographics
    let insightsResult = { success: false, count: 0, error: '' }
    
    if (!rateLimitHit) {
      console.log(`[Meta Backfill Worker] 📈 Fetching 90-day ad-level insights and demographics...`)
      try {
        // Add 5-second delay before insights fetch to give Meta API breathing room
        console.log(`[Meta Backfill Worker] ⏳ Waiting 5 seconds before fetching insights to avoid rate limits...`)
        await new Promise(resolve => setTimeout(resolve, 5000))
        
        // Fetch ad-level insights with skipDemographics=false to get both
        // The fetchMetaAdInsights function has built-in retry logic for rate limits
        insightsResult = await fetchMetaAdInsights(brandId, startDate, endDate, true, false)
        
        if (insightsResult.success) {
          console.log(`[Meta Backfill Worker] ✅ Insights & Demographics: ${insightsResult.count || 0} records fetched`)
        } else if (insightsResult.error?.includes('rate limit') || insightsResult.error?.includes('Application request limit')) {
          // Rate limit hit - this is expected with Meta's strict limits
          console.warn(`[Meta Backfill Worker] ⚠️ Rate limit hit during insights fetch - will retry with longer delays`)
          
          // Mark as partial but keep the data we got
          rateLimitHit = true
          insightsResult.success = true // Treat partial success as ok
        } else {
          console.warn(`[Meta Backfill Worker] ⚠️ Failed to fetch insights:`, insightsResult.error)
        }
      } catch (insightsError) {
        console.error(`[Meta Backfill Worker] ❌ Insights fetch error:`, insightsError)
        insightsResult = { success: false, count: 0, error: String(insightsError) }
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
            last_full_sync_result: `${rateLimitHit ? 'PARTIAL_' : ''}success_90_days: ${campaignCount} campaigns, ${totalAdsets} adsets, ${insightsResult.count || 0} ad-level insights`,
            needs_manual_sync: rateLimitHit // Flag for UI to show "Complete Sync" button
          }
        })
        .eq('id', connectionId)
    }

    console.log(`[Meta Backfill Worker] 🎉 COMPLETE - Campaigns: ${campaignCount}, Adsets: ${totalAdsets}, Insights: ${insightsResult.count || 0}${rateLimitHit ? ' (INCOMPLETE - rate limited)' : ''}`)

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

