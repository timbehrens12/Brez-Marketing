import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes for backfill

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

    // 2. Fetch adsets for each campaign (with 90-day date range!)
    console.log(`[Meta Backfill Worker] 📊 Fetching adsets for ${campaignCount} campaigns...`)
    let totalAdsets = 0
    if (campaignsResult.success && campaignsResult.budgets) {
      for (const campaign of campaignsResult.budgets) {
        try {
          // IMPORTANT: Pass startDate and endDate to get 90 days of adset insights!
          const adsetsResult = await fetchMetaAdSets(brandId, campaign.campaign_id, true, startDate, endDate)
          if (adsetsResult.success) {
            totalAdsets += adsetsResult.adsets?.length || 0
          }
        } catch (adsetError) {
          console.warn(`[Meta Backfill Worker] Adset fetch failed for campaign ${campaign.campaign_id}:`, adsetError)
        }
      }
    }
    console.log(`[Meta Backfill Worker] ✅ Adsets: ${totalAdsets}`)

    // 3. Fetch insights + demographics
    console.log(`[Meta Backfill Worker] 📈 Fetching insights & demographics...`)
    const insightsResult = await fetchMetaAdInsights(brandId, startDate, endDate, false, false)
    console.log(`[Meta Backfill Worker] ✅ Insights: ${insightsResult.count || 0}`)

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
          sync_status: 'completed',
          last_synced_at: new Date().toISOString(),
          metadata: {
            ...(existingConnection?.metadata || {}),
            full_sync_in_progress: false,
            last_full_sync_completed_at: new Date().toISOString(),
            last_full_sync_result: `success_90_days: ${campaignCount} campaigns, ${totalAdsets} adsets, ${insightsResult.count || 0} insights`
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

