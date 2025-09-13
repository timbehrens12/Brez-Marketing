import { NextRequest, NextResponse } from 'next/server'

/**
 * FORCE CLEAR ALL DEMOGRAPHICS JOBS - For switching to smart approach
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[Force Clear Demographics] 🚨 REMOVING ALL DEMOGRAPHICS JOBS...')

    // Import Meta queue service
    const { metaQueue } = await import('@/lib/services/metaQueueService')
    
    // Get all waiting jobs
    const waitingJobs = await metaQueue.getJobs(['waiting'], 0, 500)
    
    console.log(`[Force Clear Demographics] 📊 Found ${waitingJobs.length} waiting jobs`)
    
    let removedCount = 0
    
    // Remove ALL historical_demographics jobs
    for (const job of waitingJobs) {
      try {
        if (job.name === 'historical_demographics') {
          console.log(`[Force Clear Demographics] ❌ Removing demographics job ${job.id}: ${job.data?.description}`)
          await job.remove()
          removedCount++
        }
      } catch (err) {
        console.warn(`[Force Clear Demographics] ⚠️ Error removing job ${job.id}:`, err)
      }
    }
    
    // Also clean any stalled jobs
    await metaQueue.clean(0, 'active')
    await metaQueue.clean(0, 'delayed')
    await metaQueue.clean(0, 'failed')
    
    console.log(`[Force Clear Demographics] ✅ Removed ${removedCount} demographics jobs`)
    
    // Get final stats
    const finalWaiting = await metaQueue.getJobs(['waiting'], 0, 100)
    
    return NextResponse.json({
      success: true,
      message: `Removed ${removedCount} demographics jobs`,
      remainingJobs: finalWaiting.length,
      removedJobs: removedCount
    })
    
  } catch (error) {
    console.error('[Force Clear Demographics] ❌ Error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
