import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { 
  detectStaleData, 
  detectAllDataGapsAndStaleData,
  shouldTriggerEnhancedBackfill 
} from '@/lib/services/data-gap-detection'

/**
 * Debug endpoint to test stale data detection logic
 * Use this to see exactly what's happening with yesterday's $0.43 vs $0.44 issue
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const url = new URL(request.url)
    const brandId = url.searchParams.get('brandId')
    const lookbackDays = parseInt(url.searchParams.get('lookbackDays') || '7')
    
    if (!brandId) {
      return NextResponse.json({ error: 'brandId is required' }, { status: 400 })
    }

    console.log(`[Debug Stale Detection] Testing stale detection for brand ${brandId} (${lookbackDays} days back)`)
    
    // Run the enhanced detection
    const results = await detectAllDataGapsAndStaleData(brandId, lookbackDays)
    const backfillDecision = shouldTriggerEnhancedBackfill(results)
    
    // Also test just Meta platform directly
    let metaStaleDetails = null
    try {
      metaStaleDetails = await detectStaleData(brandId, 'meta', lookbackDays)
    } catch (error) {
      console.error('[Debug Stale Detection] Error with Meta stale detection:', error)
      metaStaleDetails = { error: error instanceof Error ? error.message : 'Unknown error' }
    }
    
    return NextResponse.json({
      success: true,
      brandId,
      lookbackDays,
      timestamp: new Date().toISOString(),
      enhancedResults: results,
      backfillDecision,
      metaStaleDetails,
      summary: {
        totalStaleDataFound: backfillDecision.totalStaleDays,
        staleDatesToRefresh: backfillDecision.staleDatesToRefresh,
        shouldTriggerBackfill: backfillDecision.shouldBackfill
      }
    })

  } catch (error) {
    console.error('[Debug Stale Detection] Error:', error)
    return NextResponse.json({ 
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 