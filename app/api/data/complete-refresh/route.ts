import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { 
  performCompleteDataRefresh, 
  performDeepHistoricalScan,
  performOneTimeHistoricalCleanup 
} from '@/lib/services/data-gap-detection'
import { createClient } from '@/lib/supabase/server'

/**
 * API endpoint to perform a complete data refresh that handles:
 * 1. Recent data refresh (last 72 hours)
 * 2. Historical stale data detection and refresh 
 * 3. Regular gap detection and backfill
 * 
 * Modes:
 * - "standard": Default 60-day lookback (catches most issues)
 * - "deep": 90-day historical scan (for older stale data)  
 * - "comprehensive": Up to 1-year cleanup (one-time fix for extensive history)
 * 
 * This fixes both recent "locked" data and historical stale data like the 
 * "Wednesday $0.43 forever" issue from weeks/months ago.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { 
      brandId, 
      lookbackDays = 3, // Changed to 3 days to have some data while avoiding timeouts
      mode = 'standard' // 'standard', 'deep', or 'comprehensive'
    } = await request.json()
    
    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    console.log(`[Complete Refresh API] Starting ${mode} refresh for brand ${brandId} (${lookbackDays} days lookback)`)

    const supabase = createClient()

    let fullSyncInProgress = false
    let syncStatus: string | null = null

    try {
      const { data: connection } = await supabase
        .from('platform_connections')
        .select('id,sync_status,metadata')
        .eq('brand_id', brandId)
        .eq('platform_type', 'meta')
        .single()

      if (connection) {
        syncStatus = connection.sync_status || null
        const metadataFlag = connection.metadata?.full_sync_in_progress
        if (metadataFlag) {
          fullSyncInProgress = true
        }
      }
    } catch (statusError) {
      console.warn('[Complete Refresh API] Unable to read sync status:', statusError)
    }

    if (fullSyncInProgress || syncStatus === 'full_sync') {
      console.log('[Complete Refresh API] Skipping refresh because full historical sync is in progress or just completed')
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: 'full_sync_in_progress',
        message: 'Historical sync detected – skipping dashboard refresh to avoid wiping data.'
      })
    }

    let result: any

    if (mode === 'comprehensive') {
      // One-time comprehensive cleanup (limited to prevent timeouts)
      const maxDays = Math.min(lookbackDays, 7) // Cap at 7 days to prevent timeouts
      result = await performOneTimeHistoricalCleanup(brandId, maxDays)
      
      if (result.success) {
        return NextResponse.json({
          success: true,
          mode: 'comprehensive',
          message: `Comprehensive cleanup complete: scanned ${result.scannedDays} days, fixed ${result.staleDataRefreshed} stale days in ${result.timeToComplete}`,
          details: {
            scannedDays: result.scannedDays,
            totalStaleDataFound: result.totalStaleDataFound,
            staleDataRefreshed: result.staleDataRefreshed,
            oldestStaleDate: result.oldestStaleDate,
            timeToComplete: result.timeToComplete
          }
        })
      } else {
        return NextResponse.json({
          success: false,
          mode: 'comprehensive',
          error: result.error,
          details: result
        }, { status: 500 })
      }
      
    } else if (mode === 'deep') {
      // Deep historical scan (90+ days)
      result = await performDeepHistoricalScan(brandId, lookbackDays)
      
      if (result.success) {
        return NextResponse.json({
          success: true,
          mode: 'deep',
          message: `Deep scan complete: found ${result.totalStaleDataFound} stale days, fixed ${result.staleDataRefreshed}`,
          details: {
            totalStaleDataFound: result.totalStaleDataFound,
            staleDataRefreshed: result.staleDataRefreshed,
            oldestStaleDate: result.oldestStaleDate,
            newestStaleDate: result.newestStaleDate
          }
        })
      } else {
        return NextResponse.json({
          success: false,
          mode: 'deep',
          error: result.error,
          details: result
        }, { status: 500 })
      }
      
    } else {
      // Standard complete refresh (60 days default)
      result = await performCompleteDataRefresh(brandId, lookbackDays)
      
      if (result.success) {
        const summary = []
        if (result.recentDataRefreshed) summary.push('recent data refreshed')
        if (result.staleDataRefreshed > 0) summary.push(`${result.staleDataRefreshed} stale days fixed`)
        if (result.totalGapsFilled > 0) summary.push(`${result.totalGapsFilled} gaps filled`)
        
        return NextResponse.json({
          success: true,
          mode: 'standard',
          message: `Complete refresh done: ${summary.join(', ')}`,
          details: {
            recentDataRefreshed: result.recentDataRefreshed,
            staleDataRefreshed: result.staleDataRefreshed,
            totalGapsFilled: result.totalGapsFilled
          }
        })
      } else {
        return NextResponse.json({
          success: false,
          mode: 'standard',
          error: result.error,
          details: {
            recentDataRefreshed: result.recentDataRefreshed,
            staleDataRefreshed: result.staleDataRefreshed,
            totalGapsFilled: result.totalGapsFilled
          }
        }, { status: 500 })
      }
    }

  } catch (error) {
    console.error('[Complete Refresh API] Error:', error)
    return NextResponse.json({ 
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 