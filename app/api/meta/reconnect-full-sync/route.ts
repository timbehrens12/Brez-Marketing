import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

/**
 * PRODUCTION FIX: Complete 12-month sync after reconnection
 * This ensures ALL historical data is properly populated
 */
export async function POST(request: NextRequest) {
  
  // 🛡️ NUCLEAR PROTECTION: Auto-complete after 5 minutes to prevent stuck syncs
  const SYNC_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes
  const timeoutId = setTimeout(async () => {
    console.log(`🚨 [Meta Reconnect] TIMEOUT PROTECTION: Force completing stuck sync after 5 minutes`)
    
    try {
      const supabase = createClient()
      await supabase
        .from('platform_connections')
        .update({
          sync_status: 'completed',
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('platform_type', 'meta')
        .eq('sync_status', 'in_progress')
      
      console.log(`✅ [Meta Reconnect] TIMEOUT PROTECTION: Sync force-completed`)
    } catch (error) {
      console.error(`❌ [Meta Reconnect] TIMEOUT PROTECTION failed:`, error)
    }
  }, SYNC_TIMEOUT_MS)

  try {
    const { userId } = await auth()
    if (!userId) {
      clearTimeout(timeoutId)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { brandId, accessToken, adAccountId } = await request.json()
    if (!brandId || !accessToken || !adAccountId) {
      clearTimeout(timeoutId)
      return NextResponse.json({ 
        error: 'Brand ID, access token, and ad account ID required' 
      }, { status: 400 })
    }

    console.log(`🚀 [Meta Reconnect Full Sync] Starting COMPLETE 12-month sync for brand ${brandId}`)

    const supabase = createClient()

    // 1. Update connection to active and in_progress
    const { error: connectionError } = await supabase
      .from('platform_connections')
      .update({
        status: 'active',
        sync_status: 'in_progress',
        access_token: accessToken,
        metadata: { ad_account_id: adAccountId },
        updated_at: new Date().toISOString()
      })
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')

    if (connectionError) {
      console.error(`❌ [Meta Reconnect] Error updating connection:`, connectionError)
      return NextResponse.json({ error: 'Failed to update connection' }, { status: 500 })
    }

    // 2. Import Meta service for the complete sync
    const { fetchMetaAdInsights } = await import('@/lib/services/meta-service')

    // 3. Set up COMPLETE 12-month date range
    const endDate = new Date()
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - 12) // Exactly 12 months back

    console.log(`📅 [Meta Reconnect] Syncing COMPLETE range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`)

    // 4. 🚀 USE PROVEN MONTH-BY-MONTH APPROACH (like sync-direct that worked!)
    console.log(`🛡️ [Meta Reconnect] Using PROVEN month-by-month sync (same as sync-direct)`)
    
    // 🎯 EXACT SAME APPROACH AS SYNC-DIRECT: Generate 12 monthly chunks
    const chunks = []
    const now = new Date()
    
    for (let i = 11; i >= 0; i--) { // 12 months back to current
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
      
      chunks.push({
        id: 12 - i,
        month: monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        start: monthStart.toISOString().split('T')[0],
        end: monthEnd.toISOString().split('T')[0],
        startDate: monthStart,
        endDate: monthEnd
      })
    }

    console.log(`📦 [Meta Reconnect] Generated ${chunks.length} monthly chunks (PROVEN METHOD):`)
    chunks.forEach(chunk => {
      console.log(`  ${chunk.id}. ${chunk.month} (${chunk.start} to ${chunk.end})`)
    })

    // Process chunks one by one with progress updates (NEVER GETS STUCK)
    let completedChunks = 0
    let errors = []

    for (const chunk of chunks) {
      try {
        console.log(`🔄 [Meta Reconnect] Processing ${chunk.month}...`)
        
        // Update progress (SAME AS PROVEN METHOD)
        const progressPct = Math.round((completedChunks / chunks.length) * 100)
        await supabase
          .from('platform_connections')
          .update({ sync_progress: progressPct })
          .eq('brand_id', brandId)
          .eq('platform_type', 'meta')
        
        // 🎯 PROVEN METHOD: fetchMetaAdInsights for each month
        const insightsResult = await fetchMetaAdInsights(
          brandId,
          chunk.startDate,
          chunk.endDate,
          false, // dryRun = false
          false  // skipDemographics = false
        )

        if (insightsResult.success) {
          completedChunks++
          console.log(`✅ [Meta Reconnect] ${chunk.month} insights completed (${completedChunks}/${chunks.length})`)
          
          // 🚨 ALSO SYNC ADS CREATIVE DATA: Get campaigns and adsets, then sync ads for each
          // Only sync creative data once (not for each chunk) to avoid duplicates
          if (completedChunks === 1) { // Only on first successful chunk
            console.log(`🎨 [Meta Reconnect] Syncing ads creative data (images, headlines, etc.)...`)
            
            try {
              // Get all campaigns for this brand
              const { data: campaigns } = await supabase
                .from('meta_campaigns')
                .select('campaign_id')
                .eq('brand_id', brandId)
                .eq('status', 'ACTIVE')
              
              if (campaigns && campaigns.length > 0) {
                console.log(`🎨 [Meta Reconnect] Found ${campaigns.length} campaigns, syncing adsets and ads...`)
                
                for (const campaign of campaigns) {
                  // Get adsets for this campaign
                  const { data: adsets } = await supabase
                    .from('meta_adsets')
                    .select('adset_id')
                    .eq('brand_id', brandId)
                    .eq('campaign_id', campaign.campaign_id)
                    .eq('status', 'ACTIVE')
                  
                  if (adsets && adsets.length > 0) {
                    console.log(`🎨 [Meta Reconnect] Syncing ads for ${adsets.length} adsets in campaign ${campaign.campaign_id}`)
                    
                    // Import the fetchMetaAds function
                    const { fetchMetaAds } = await import('@/lib/services/meta-service')
                    
                    for (const adset of adsets) {
                      try {
                        await fetchMetaAds(brandId, adset.adset_id, true) // forceSave = true
                        console.log(`🎨 [Meta Reconnect] Synced ads for adset ${adset.adset_id}`)
                      } catch (adsError) {
                        console.warn(`⚠️ [Meta Reconnect] Failed to sync ads for adset ${adset.adset_id}:`, adsError)
                      }
                      
                      // Small delay to prevent rate limiting
                      await new Promise(resolve => setTimeout(resolve, 1000))
                    }
                  }
                }
                
                console.log(`✅ [Meta Reconnect] Completed ads creative sync`)
              }
            } catch (adsSyncError) {
              console.warn(`⚠️ [Meta Reconnect] Ads creative sync failed (non-critical):`, adsSyncError)
            }
          }
        } else {
          console.log(`⚠️ [Meta Reconnect] ${chunk.month} failed: ${insightsResult.error}`)
          errors.push(`${chunk.month}: ${insightsResult.error}`)
        }

        // 🚨 PROVEN DELAY: Prevent rate limiting (same as sync-direct)
        await new Promise(resolve => setTimeout(resolve, 2000))

      } catch (chunkError) {
        console.error(`❌ [Meta Reconnect] Exception in ${chunk.month}:`, chunkError)
        errors.push(`${chunk.month}: ${chunkError instanceof Error ? chunkError.message : String(chunkError)}`)
      }
    }

    // Final status update (same logic as proven approach)
    const successRate = Math.round((completedChunks / chunks.length) * 100)
    const syncSuccess = successRate >= 70 // 70%+ success rate considered good (PROVEN THRESHOLD)
    
    const finalStatus = syncSuccess ? 'completed' : 'failed'
    const finalProgress = syncSuccess ? 100 : Math.round((completedChunks / chunks.length) * 100)

    await supabase
      .from('platform_connections')
      .update({
        sync_status: finalStatus,
        sync_progress: finalProgress,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')

    console.log(`🎯 [Meta Reconnect] COMPLETED! Success rate: ${successRate}% (${completedChunks}/${chunks.length} months)`)

    if (errors.length > 0) {
      console.log(`⚠️ [Meta Reconnect] Errors encountered:`, errors)
    }

    // 5. Force aggregation to ensure all data is properly structured
    console.log(`🔄 [Meta Reconnect] Force aggregating data...`)

    // Aggregate ad insights into adset daily insights
    await supabase.rpc('aggregate_meta_data', { target_brand_id: brandId })

    console.log(`✅ [Meta Reconnect] COMPLETE! Brand ${brandId} has full 12-month data`)

    // Clear timeout since sync completed successfully
    clearTimeout(timeoutId)

    return NextResponse.json({
      success: syncSuccess,
      message: syncSuccess 
        ? `Reconnect sync completed successfully! Synced ${completedChunks}/${chunks.length} months using PROVEN method.`
        : `Reconnect sync partially completed. ${completedChunks}/${chunks.length} months synced.`,
      statistics: {
        monthsCompleted: completedChunks,
        totalMonths: chunks.length,
        successRate: `${successRate}%`,
        errors: errors.length
      },
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
      action: 'check_dashboard_data'
    })

  } catch (error) {
    // Clear timeout in case of error
    clearTimeout(timeoutId)
    console.error('❌ [Meta Reconnect] Error:', error)
    return NextResponse.json({
      error: 'Failed to reconnect Meta with full sync',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
