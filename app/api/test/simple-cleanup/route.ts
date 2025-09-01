import { NextRequest, NextResponse } from 'next/server'

/**
 * Simple queue cleanup - just remove stalled jobs
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[Simple Cleanup] Starting cleanup...')

    // Parse request body for nuclear option
    let body = {}
    try {
      body = await request.json()
    } catch {
      // No body is fine
    }

    const { forceAll } = body as { forceAll?: boolean }

    // Import queue service dynamically
    const { shopifyQueue } = await import('@/lib/services/shopifyQueueService')
    
    console.log('[Simple Cleanup] Queue imported successfully')
    
    let waitingResult = 0
    
    if (forceAll) {
      console.log('[Simple Cleanup] 🚨 NUCLEAR OPTION: Removing ALL jobs including waiting...')
      
      // Get all waiting jobs and remove them individually
      const waitingJobs = await shopifyQueue.getJobs(['waiting'], 0, 500)
      console.log(`[Simple Cleanup] Found ${waitingJobs.length} waiting jobs to remove`)
      
      for (const job of waitingJobs) {
        try {
          await job.remove()
          waitingResult++
        } catch (err) {
          console.warn(`[Simple Cleanup] Failed to remove job ${job.id}:`, err)
        }
      }
      
      console.log(`[Simple Cleanup] Removed ${waitingResult} waiting jobs`)
    }
    
    // Clean the problematic job states
    console.log('[Simple Cleanup] Removing active (stalled) jobs...')
    const activeResult = await shopifyQueue.clean(0, 'active')
    
    console.log('[Simple Cleanup] Removing delayed jobs...')
    const delayedResult = await shopifyQueue.clean(0, 'delayed')
    
    console.log('[Simple Cleanup] Removing failed jobs...')  
    const failedResult = await shopifyQueue.clean(0, 'failed')
    
    console.log('[Simple Cleanup] Removing completed jobs...')
    const completedResult = await shopifyQueue.clean(0, 'completed')
    
    console.log('[Simple Cleanup] Cleanup completed')
    
    return NextResponse.json({
      success: true,
      message: forceAll ? 'Nuclear queue cleanup completed - ALL jobs removed' : 'Simple queue cleanup completed',
      removed: {
        waiting: waitingResult,
        active: activeResult,
        delayed: delayedResult,
        failed: failedResult,
        completed: completedResult
      }
    })

  } catch (error) {
    console.error('[Simple Cleanup] Error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return POST(request)
}
