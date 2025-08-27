import { NextRequest, NextResponse } from 'next/server'

/**
 * Test endpoint to clean up stalled queue jobs
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[Queue Cleanup] Starting cleanup of stalled jobs...')

    // Import queue service dynamically
    const { shopifyQueue } = await import('@/lib/services/shopifyQueueService')
    
    // Get queue stats before cleanup (using getJobs method)
    const waitingJobs = await shopifyQueue.getJobs(['waiting'], 0, 100)
    const activeJobs = await shopifyQueue.getJobs(['active'], 0, 100)
    const completedJobs = await shopifyQueue.getJobs(['completed'], 0, 100)
    const failedJobs = await shopifyQueue.getJobs(['failed'], 0, 100)
    const delayedJobs = await shopifyQueue.getJobs(['delayed'], 0, 100)
    
    const beforeStats = {
      waiting: waitingJobs.length,
      active: activeJobs.length,
      completed: completedJobs.length,
      failed: failedJobs.length,
      delayed: delayedJobs.length
    }
    
    console.log('[Queue Cleanup] Queue stats before cleanup:', beforeStats)
    
    // Clean up stalled jobs - remove jobs that are stuck
    console.log('[Queue Cleanup] Cleaning active jobs...')
    await shopifyQueue.clean(0, 'active') // Remove all active jobs (they're stalled anyway)
    
    console.log('[Queue Cleanup] Cleaning delayed jobs...')
    await shopifyQueue.clean(0, 'delayed') // Remove all delayed jobs
    
    console.log('[Queue Cleanup] Cleaning failed jobs...')
    await shopifyQueue.clean(0, 'failed') // Remove failed jobs
    
    // Get queue stats after cleanup
    const waitingJobsAfter = await shopifyQueue.getJobs(['waiting'], 0, 100)
    const activeJobsAfter = await shopifyQueue.getJobs(['active'], 0, 100)
    const completedJobsAfter = await shopifyQueue.getJobs(['completed'], 0, 100)
    const failedJobsAfter = await shopifyQueue.getJobs(['failed'], 0, 100)
    const delayedJobsAfter = await shopifyQueue.getJobs(['delayed'], 0, 100)
    
    const afterStats = {
      waiting: waitingJobsAfter.length,
      active: activeJobsAfter.length, 
      completed: completedJobsAfter.length,
      failed: failedJobsAfter.length,
      delayed: delayedJobsAfter.length
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
