import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * EMERGENCY Meta Force Disconnect Endpoint
 * Completely removes ALL Meta data for a brand
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[Meta Force Disconnect] 🚨 EMERGENCY Meta disconnect initiated')
    
    const { brandId } = await request.json()
    
    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID required' }, { status: 400 })
    }

    const supabase = createClient()
    
    console.log(`[Meta Force Disconnect] 🧹 NUCLEAR cleanup for brand ${brandId}`)
    
    // ALL 34 META TABLES - COMPREHENSIVE CLEANUP (FIXED: MISSING TABLES ADDED)
    const allMetaTables = [
      'meta_ad_insights',
      'meta_demographics', 
      'meta_device_performance',
      'meta_campaigns',
      'meta_campaign_daily_stats',
      'meta_ad_daily_insights',
      'meta_adset_daily_insights',
      'meta_ads',
      'meta_adsets',
      'meta_adsets_daily_stats',
      'meta_ads_enhanced',
      'meta_adsets_enhanced', 
      'meta_campaigns_enhanced',
      'meta_campaign_daily_insights',
      'meta_campaign_insights',
      'meta_attribution_analysis',
      'meta_attribution_data',
      'meta_audience_demographics',
      'meta_audience_performance',
      'meta_bid_strategy_performance',
      'meta_bidding_insights',
      'meta_competitive_insights',
      'meta_creative_insights',
      'meta_creative_performance',
      'meta_custom_audience_performance',
      'meta_custom_conversions',
      'meta_data_tracking',
      'meta_frequency_analysis',
      'meta_geographic_performance',
      'meta_interest_performance',
      'meta_placement_performance',
      'meta_sync_history',
      'meta_time_performance'
    ]

    let totalDeleted = 0
    const deletionResults = []

    // Delete from ALL Meta tables
    for (const table of allMetaTables) {
      try {
        const { count, error: countError } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
          .eq('brand_id', brandId)

        if (!countError && count && count > 0) {
          console.log(`[Meta Force Disconnect] 🗑️ Deleting ${count} records from ${table}`)
          
          const { error: deleteError } = await supabase
            .from(table)
            .delete()
            .eq('brand_id', brandId)

          if (deleteError) {
            console.error(`[Meta Force Disconnect] ❌ Error deleting from ${table}:`, deleteError)
            deletionResults.push({ table, count: 0, error: deleteError.message })
          } else {
            console.log(`[Meta Force Disconnect] ✅ Deleted ${count} records from ${table}`)
            deletionResults.push({ table, count, error: null })
            totalDeleted += count
          }
        } else {
          deletionResults.push({ table, count: 0, error: countError?.message || null })
        }
      } catch (error) {
        console.error(`[Meta Force Disconnect] ❌ Error processing table ${table}:`, error)
        deletionResults.push({ 
          table, 
          count: 0, 
          error: error instanceof Error ? error.message : String(error) 
        })
      }
    }

    // Delete platform connections
    console.log(`[Meta Force Disconnect] 🔌 Removing Meta platform connections`)
    const { error: connectionError } = await supabase
      .from('platform_connections')
      .delete()
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')

    if (connectionError) {
      console.error(`[Meta Force Disconnect] ❌ Error deleting connections:`, connectionError)
    } else {
      console.log(`[Meta Force Disconnect] ✅ Meta connections removed`)
    }

    // Delete ETL jobs
    console.log(`[Meta Force Disconnect] 📋 Removing Meta ETL jobs`)
    const { error: etlError } = await supabase
      .from('etl_job')
      .delete()
      .eq('brand_id', brandId)
      .like('job_type', 'meta_%')

    if (etlError) {
      console.error(`[Meta Force Disconnect] ❌ Error deleting ETL jobs:`, etlError)
    } else {
      console.log(`[Meta Force Disconnect] ✅ Meta ETL jobs removed`)
    }

    // 🎯 CRITICAL: Clean up queue jobs for this brand to prevent future blocking
    let queueCleanupSuccess = false
    try {
      console.log(`[Meta Force Disconnect] 🧹 Cleaning up queue jobs for brand ${brandId}`)
      const { MetaQueueService } = await import('@/lib/services/metaQueueService')
      await MetaQueueService.cleanupJobsByBrand(brandId)
      queueCleanupSuccess = true
      console.log(`[Meta Force Disconnect] ✅ Queue cleanup completed`)
    } catch (queueError) {
      console.error(`[Meta Force Disconnect] ⚠️ Queue cleanup failed:`, queueError)
      // Don't fail the whole operation if queue cleanup fails
    }

    console.log(`[Meta Force Disconnect] 🎉 COMPLETE! Deleted ${totalDeleted} total records`)

    return NextResponse.json({
      success: true,
      message: `Meta force disconnect completed`,
      totalDeleted,
      tablesProcessed: allMetaTables.length,
      deletionResults,
      connectionDeleted: !connectionError,
      etlJobsDeleted: !etlError,
      queueCleanupSuccess
    })

  } catch (error) {
    console.error('[Meta Force Disconnect] 💥 Error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
