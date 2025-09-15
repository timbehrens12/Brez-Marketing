import { NextRequest, NextResponse } from 'next/server'

/**
 * EMERGENCY ENDPOINT - Clear ALL Meta queue jobs to stop rate limiting
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[Emergency Clear] 🚨 CLEARING ALL META QUEUE JOBS TO STOP RATE LIMITING...')

    // Import Meta queue service
    const { metaQueue } = await import('@/lib/services/metaQueueService')
    
    // Get all jobs
    const waitingJobs = await metaQueue.getJobs(['waiting'], 0, 1000)
    const activeJobs = await metaQueue.getJobs(['active'], 0, 100)
    const failedJobs = await metaQueue.getJobs(['failed'], 0, 1000)
    const delayedJobs = await metaQueue.getJobs(['delayed'], 0, 1000)
    
    console.log(`[Emergency Clear] Found jobs: ${waitingJobs.length} waiting, ${activeJobs.length} active, ${failedJobs.length} failed, ${delayedJobs.length} delayed`)
    
    let removedCount = 0
    
    // Remove ALL Meta jobs regardless of status
    const allJobs = [...waitingJobs, ...activeJobs, ...failedJobs, ...delayedJobs]
    
    for (const job of allJobs) {
      try {
        await job.remove()
        removedCount++
      } catch (err) {
        console.warn(`[Emergency Clear] ⚠️ Error removing job ${job.id}:`, err)
      }
    }
    
    // Also clean up job states aggressively
    await metaQueue.clean(0, 'active')
    await metaQueue.clean(0, 'delayed')
    await metaQueue.clean(0, 'failed')
    await metaQueue.clean(0, 'waiting')
    
    console.log(`[Emergency Clear] ✅ Removed ${removedCount} Meta jobs and cleaned all states`)
    
    return NextResponse.json({
      success: true,
      message: `Emergency clear completed - removed ${removedCount} jobs`,
      removedJobs: removedCount,
      clearedStates: ['active', 'delayed', 'failed', 'waiting']
    })
    
  } catch (error) {
    console.error('[Emergency Clear] ❌ Error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
