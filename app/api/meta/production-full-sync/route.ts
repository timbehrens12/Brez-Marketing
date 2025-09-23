import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

/**
 * PRODUCTION-LEVEL FULL SYNC: 12-month chunked sync that actually works
 * Uses the proven month-by-month approach that worked for the stuck sync issue
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { brandId, accessToken, adAccountId } = await request.json()
    
    if (!brandId || !accessToken || !adAccountId) {
      return NextResponse.json({ 
        error: 'Brand ID, access token, and ad account ID required' 
      }, { status: 400 })
    }

    console.log(`🚀 [Production Sync] Starting PROVEN 12-month chunked sync for brand ${brandId}`)

    const supabase = createClient()

    // 1. Update connection status to in_progress
    const { error: connectionError } = await supabase
      .from('platform_connections')
      .update({
        status: 'active',
        sync_status: 'in_progress',
        access_token: accessToken,
        metadata: { ad_account_id: adAccountId },
        updated_at: new Date().toISOString(),
        sync_progress: 0
      })
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')

    if (connectionError) {
      console.error(`❌ [Production Sync] Error updating connection:`, connectionError)
      return NextResponse.json({ error: 'Failed to update connection' }, { status: 500 })
    }

    // 2. Generate 12 monthly chunks (March 2025 - February 2026, or last 12 months)
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

    console.log(`📦 [Production Sync] Generated ${chunks.length} monthly chunks:`)
    chunks.forEach(chunk => {
      console.log(`  ${chunk.id}. ${chunk.month} (${chunk.start} to ${chunk.end})`)
    })

    // 3. Import Meta service for sync
    const { fetchMetaAdInsights, fetchMetaAds } = await import('@/lib/services/meta-service')

    let completedChunks = 0
    let errors: string[] = []
    let totalRecords = 0

    // 4. Process each month chunk (PROVEN APPROACH)
    for (const chunk of chunks) {
      try {
        console.log(`🔄 [Production Sync] Processing ${chunk.month}...`)
        
        // Update progress
        const progressPct = Math.round((completedChunks / chunks.length) * 100)
        await supabase
          .from('platform_connections')
          .update({ sync_progress: progressPct })
          .eq('brand_id', brandId)
          .eq('platform_type', 'meta')

        // Sync insights for this month (PROVEN METHOD)
        const insightsResult = await fetchMetaAdInsights(
          brandId,
          chunk.startDate,
          chunk.endDate,
          false, // dryRun = false
          false  // skipDemographics = false
        )

        if (insightsResult.success) {
          completedChunks++
          totalRecords += insightsResult.recordsProcessed || 0
          console.log(`✅ [Production Sync] ${chunk.month} insights completed (${completedChunks}/${chunks.length})`)
          
          // 🚨 ALSO SYNC ADS CREATIVE DATA for first chunk only (to avoid duplicates)
          if (completedChunks === 1) {
            console.log(`🎨 [Production Sync] Adding ads creative data sync...`)
            
            try {
              // Get all campaigns and adsets, then sync ads creative data
              const { data: campaigns } = await supabase
                .from('meta_campaigns')
                .select('campaign_id')
                .eq('brand_id', brandId)
                .eq('status', 'ACTIVE')
              
              if (campaigns && campaigns.length > 0) {
                console.log(`🎨 [Production Sync] Syncing creative data for ${campaigns.length} campaigns`)
                
                for (const campaign of campaigns) {
                  const { data: adsets } = await supabase
                    .from('meta_adsets')
                    .select('adset_id')
                    .eq('brand_id', brandId)
                    .eq('campaign_id', campaign.campaign_id)
                    .eq('status', 'ACTIVE')
                  
                  if (adsets && adsets.length > 0) {
                    for (const adset of adsets) {
                      try {
                        await fetchMetaAds(brandId, adset.adset_id, true)
                        console.log(`🎨 [Production Sync] Synced creative data for adset ${adset.adset_id}`)
                      } catch (adsError) {
                        console.warn(`⚠️ [Production Sync] Failed creative sync for adset ${adset.adset_id}:`, adsError)
                      }
                      
                      // Rate limiting delay
                      await new Promise(resolve => setTimeout(resolve, 500))
                    }
                  }
                }
                
                console.log(`✅ [Production Sync] Creative data sync completed`)
              }
            } catch (creativeSyncError) {
              console.warn(`⚠️ [Production Sync] Creative sync failed (non-critical):`, creativeSyncError)
            }
          }
        } else {
          console.log(`⚠️ [Production Sync] ${chunk.month} failed: ${insightsResult.error}`)
          errors.push(`${chunk.month}: ${insightsResult.error}`)
        }

        // Delay between chunks to prevent rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000))

      } catch (chunkError) {
        console.error(`❌ [Production Sync] Exception in ${chunk.month}:`, chunkError)
        errors.push(`${chunk.month}: ${chunkError instanceof Error ? chunkError.message : String(chunkError)}`)
      }
    }

    // 5. Final status update
    const successRate = Math.round((completedChunks / chunks.length) * 100)
    const syncSuccess = successRate >= 70 // 70%+ success rate considered good
    
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

    console.log(`🎯 [Production Sync] COMPLETED! Success rate: ${successRate}% (${completedChunks}/${chunks.length} months)`)
    console.log(`📊 [Production Sync] Total records processed: ${totalRecords}`)

    if (errors.length > 0) {
      console.log(`⚠️ [Production Sync] Errors encountered:`, errors)
    }

    return NextResponse.json({
      success: syncSuccess,
      message: syncSuccess 
        ? `Production sync completed successfully! Synced ${completedChunks}/${chunks.length} months with ${totalRecords} records.`
        : `Production sync partially completed. ${completedChunks}/${chunks.length} months synced.`,
      statistics: {
        monthsCompleted: completedChunks,
        totalMonths: chunks.length,
        successRate: `${successRate}%`,
        recordsProcessed: totalRecords,
        errors: errors.length
      },
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ [Production Sync] Fatal error:', error)
    
    // Ensure connection status is updated even on fatal error
    try {
      const supabase = createClient()
      await supabase
        .from('platform_connections')
        .update({
          sync_status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('platform_type', 'meta')
        .eq('sync_status', 'in_progress')
    } catch (updateError) {
      console.error('Failed to update connection status after fatal error:', updateError)
    }

    return NextResponse.json(
      { 
        error: 'Production sync failed', 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    )
  }
}
