import { NextRequest, NextResponse } from 'next/server'

/**
 * Test endpoint to clean up stalled queue jobs
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[Queue Cleanup] Starting cleanup of stalled jobs...')

    // Import queue service dynamically
    const { shopifyQueue } = await import('@/lib/services/shopifyQueueService')
    
    // Get queue stats before cleanup
    const beforeStats = {
      waiting: await shopifyQueue.waiting(),
      active: await shopifyQueue.active(),
      completed: await shopifyQueue.completed(),
      failed: await shopifyQueue.failed(),
      delayed: await shopifyQueue.delayed()
    }
    
    console.log('[Queue Cleanup] Queue stats before cleanup:', beforeStats)
    
    // Clean up stalled jobs - remove jobs that are stuck
    await shopifyQueue.clean(0, 'active') // Remove all active jobs (they're stalled anyway)
    await shopifyQueue.clean(0, 'delayed') // Remove all delayed jobs
    await shopifyQueue.clean(0, 'failed') // Remove failed jobs
    
    // Get queue stats after cleanup
    const afterStats = {
      waiting: await shopifyQueue.waiting(),
      active: await shopifyQueue.active(), 
      completed: await shopifyQueue.completed(),
      failed: await shopifyQueue.failed(),
      delayed: await shopifyQueue.delayed()
    }
    
    console.log('[Queue Cleanup] Queue stats after cleanup:', afterStats)
    
    return NextResponse.json({
      success: true,
      message: 'Queue cleanup completed',
      before: beforeStats,
      after: afterStats
    })

  } catch (error) {
    console.error('[Queue Cleanup] Error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return POST(request)
}
