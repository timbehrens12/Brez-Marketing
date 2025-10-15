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

    // 2. Fetch adsets for each campaign (with 90-day insights + automatic rate limit retry)
    console.log(`[Meta Backfill Worker] 📊 Fetching adsets for ${campaignCount} campaigns (90-day insights)...`)
    let totalAdsets = 0
    let retryAfterSeconds = 0
    
    if (campaignsResult.success && campaignsResult.budgets) {
      for (const campaign of campaignsResult.budgets) {
        let retryCount = 0
        const maxRetries = 1 // Only retry once after rate limit
        
        while (retryCount <= maxRetries) {
          try {
            // Pass date range to get 90 days of adset insights
            const adsetsResult = await fetchMetaAdSets(brandId, campaign.campaign_id, true, startDate, endDate)
            
            if (adsetsResult.success) {
              totalAdsets += adsetsResult.adsets?.length || 0
              console.log(`[Meta Backfill Worker] ✅ Campaign ${campaign.campaign_id}: ${adsetsResult.adsets?.length || 0} adsets fetched`)
              break // Success, move to next campaign
            } else if (adsetsResult.error?.includes('rate limit')) {
              // Extract wait time from error message (e.g., "Wait 298s")
              const waitMatch = adsetsResult.error.match(/Wait (\d+)s/)
              const waitSeconds = waitMatch ? parseInt(waitMatch[1]) : 300
              
              if (retryCount < maxRetries) {
                console.warn(`[Meta Backfill Worker] ⏳ Rate limited - waiting ${waitSeconds}s before retry...`)
                retryAfterSeconds = waitSeconds
                await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000))
                retryCount++
                console.log(`[Meta Backfill Worker] 🔄 Retrying campaign ${campaign.campaign_id}...`)
              } else {
                console.error(`[Meta Backfill Worker] ❌ Rate limit retry failed for campaign ${campaign.campaign_id}`)
                break
              }
            } else {
              console.warn(`[Meta Backfill Worker] ⚠️ Failed to fetch adsets for campaign ${campaign.campaign_id}:`, adsetsResult.error)
              break
            }
          } catch (adsetError) {
            console.error(`[Meta Backfill Worker] ❌ Adset fetch error for campaign ${campaign.campaign_id}:`, adsetError)
            break
          }
        }
        
        // Add 2-second delay between campaigns to reduce API load
        if (campaignsResult.budgets.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      }
    }
    
    console.log(`[Meta Backfill Worker] ✅ Adsets: ${totalAdsets} (with 90-day insights)${retryAfterSeconds > 0 ? ` - Had to wait ${retryAfterSeconds}s for rate limit` : ''}`)

    // 3. Fetch insights + demographics (with retry logic)
    console.log(`[Meta Backfill Worker] 📈 Fetching insights & demographics...`)
    let insightsResult
    let insightsRetryCount = 0
    
    while (insightsRetryCount <= 1) {
      try {
        insightsResult = await fetchMetaAdInsights(brandId, startDate, endDate, false, false)
        
        if (insightsResult.success || !insightsResult.error?.includes('rate limit')) {
          break // Success or non-rate-limit error
        }
        
        // Rate limited - wait and retry
        const waitMatch = insightsResult.error.match(/Wait (\d+)s/)
        const waitSeconds = waitMatch ? parseInt(waitMatch[1]) : 300
        
        if (insightsRetryCount < 1) {
          console.warn(`[Meta Backfill Worker] ⏳ Insights rate limited - waiting ${waitSeconds}s...`)
          await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000))
          insightsRetryCount++
          console.log(`[Meta Backfill Worker] 🔄 Retrying insights fetch...`)
        } else {
          console.error(`[Meta Backfill Worker] ❌ Insights retry failed after rate limit`)
          break
        }
      } catch (insightsError) {
        console.error(`[Meta Backfill Worker] ❌ Insights fetch error:`, insightsError)
        insightsResult = { success: false, count: 0, error: String(insightsError) }
        break
      }
    }
    
    console.log(`[Meta Backfill Worker] ✅ Insights: ${insightsResult?.count || 0}`)

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

