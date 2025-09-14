import { NextRequest, NextResponse } from 'next/server'
import { MetaQueueService } from '@/lib/services/metaQueueService'

export async function POST(request: NextRequest) {
  try {
    console.log('[Cleanup Failed Demographics] Starting cleanup...')
    
    // Get the queue instance
    const queue = MetaQueueService.getQueue()
    
    // Get all failed jobs
    const failedJobs = await queue.getFailed(0, -1)
    console.log(`[Cleanup Failed Demographics] Found ${failedJobs.length} failed jobs`)
    
    // Filter for demographics jobs only
    const failedDemographicsJobs = failedJobs.filter(job => 
      job.data?.jobType === 'historical_demographics' || 
      job.name === 'historical_demographics'
    )
    
    console.log(`[Cleanup Failed Demographics] Found ${failedDemographicsJobs.length} failed demographics jobs`)
    
    // Remove all failed demographics jobs
    let removedCount = 0
    for (const job of failedDemographicsJobs) {
      try {
        await job.remove()
        removedCount++
      } catch (error) {
        console.error(`[Cleanup Failed Demographics] Error removing job ${job.id}:`, error)
      }
    }
    
    // Also clean up waiting demographics jobs (they might be stuck)
    const waitingJobs = await queue.getWaiting(0, -1)
    const waitingDemographicsJobs = waitingJobs.filter(job => 
      job.data?.jobType === 'historical_demographics' || 
      job.name === 'historical_demographics'
    )
    
    console.log(`[Cleanup Failed Demographics] Found ${waitingDemographicsJobs.length} waiting demographics jobs`)
    
    for (const job of waitingDemographicsJobs) {
      try {
        await job.remove()
        removedCount++
      } catch (error) {
        console.error(`[Cleanup Failed Demographics] Error removing waiting job ${job.id}:`, error)
      }
    }
    
    console.log(`[Cleanup Failed Demographics] ✅ Removed ${removedCount} demographics jobs`)
    
    return NextResponse.json({
      success: true,
      message: `Cleaned up ${removedCount} failed/waiting demographics jobs`,
      removedCount
    })
    
  } catch (error) {
    console.error('[Cleanup Failed Demographics] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
