import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { ShopifyQueueService } from '@/lib/services/shopifyQueueService'

/**
 * POST /api/shopify/historical-backfill
 * 
 * Triggers historical data backfill using the new V2 queue system
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { brandId, forceRefresh = false } = await request.json()
    
    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    console.log(`[Historical Backfill] Starting V2 backfill for brand ${brandId}`)

    // Queue historical sync jobs using V2 system
    const result = await ShopifyQueueService.queueHistoricalSync(brandId)
    
    return NextResponse.json({
      success: true,
      message: 'Historical backfill queued successfully',
      jobs: result.jobs,
      estimated_completion: result.estimated_completion
    })

  } catch (error) {
    console.error('[Historical Backfill] Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to start historical backfill',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}