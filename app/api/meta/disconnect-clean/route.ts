import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

/**
 * PRODUCTION FIX: Clean disconnect that wipes ALL Meta data
 * This ensures a fresh start when reconnecting
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { brandId } = await request.json()
    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID required' }, { status: 400 })
    }

    console.log(`🧹 [Meta Disconnect Clean] Starting COMPLETE Meta data wipe for brand ${brandId}`)

    const supabase = createClient()

    // 1. Delete ALL Meta data for this brand (complete clean slate)
    const tablesToClean = [
      'meta_ad_insights',
      'meta_adset_daily_insights', 
      'meta_adsets',
      'meta_campaigns',
      'meta_ads',
      'meta_demographics',
      'meta_device_performance',
      'meta_campaign_daily_stats'
    ]

    let deletedCounts: Record<string, number> = {}

    for (const table of tablesToClean) {
      try {
        const { data, error } = await supabase
          .from(table)
          .delete()
          .eq('brand_id', brandId)
          .select('id')

        if (error) {
          console.log(`⚠️ [Meta Disconnect Clean] Table ${table} might not exist: ${error.message}`)
          deletedCounts[table] = 0
        } else {
          deletedCounts[table] = data?.length || 0
          console.log(`✅ [Meta Disconnect Clean] Deleted ${deletedCounts[table]} records from ${table}`)
        }
      } catch (err) {
        console.log(`⚠️ [Meta Disconnect Clean] Table ${table} cleanup failed: ${err}`)
        deletedCounts[table] = 0
      }
    }

    // 2. Update connection status to disconnected
    const { error: connectionError } = await supabase
      .from('platform_connections')
      .update({
        status: 'disconnected',
        sync_status: 'not_started',
        last_synced_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')

    if (connectionError) {
      console.error(`❌ [Meta Disconnect Clean] Error updating connection status:`, connectionError)
    }

    console.log(`🎯 [Meta Disconnect Clean] COMPLETE! Brand ${brandId} Meta data wiped clean`)

    return NextResponse.json({
      success: true,
      message: 'Meta completely disconnected and all data wiped',
      deletedCounts,
      action: 'reconnect_meta_for_fresh_sync'
    })

  } catch (error) {
    console.error('❌ [Meta Disconnect Clean] Error:', error)
    return NextResponse.json({
      error: 'Failed to clean disconnect Meta',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
