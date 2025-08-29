import { NextRequest, NextResponse } from 'next/server'

/**
 * Test endpoint to clean up stalled queue jobs
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[Queue Cleanup] Starting cleanup of stalled jobs...')

    // Parse request body for specific connection IDs (optional)
    let body = {}
    try {
      body = await request.json()
    } catch {
      // No body is fine, clean everything
    }

    const { connectionIds } = body as { connectionIds?: string[] }

    // Import services
    const { shopifyQueue } = await import('@/lib/services/shopifyQueueService')
    const { createClient } = await import('@/lib/supabase/server')
    
    // Get all active connections to check against
    const supabase = createClient()
    const { data: activeConnections } = await supabase
      .from('platform_connections')
      .select('id')
      .eq('status', 'active')
    
    const activeConnectionIds = new Set(activeConnections?.map(c => c.id) || [])
    
    // Get queue stats before cleanup (using getJobs method)
    const waitingJobs = await shopifyQueue.getJobs(['waiting'], 0, 200)
    const activeJobs = await shopifyQueue.getJobs(['active'], 0, 100)
    const completedJobs = await shopifyQueue.getJobs(['completed'], 0, 100)
    const failedJobs = await shopifyQueue.getJobs(['failed'], 0, 100)
    const delayedJobs = await shopifyQueue.getJobs(['delayed'], 0, 200)
    
    const beforeStats = {
      waiting: waitingJobs.length,
      active: activeJobs.length,
      completed: completedJobs.length,
      failed: failedJobs.length,
      delayed: delayedJobs.length
    }
    
    console.log('[Queue Cleanup] Queue stats before cleanup:', beforeStats)
    
    // Clean up orphaned waiting jobs (jobs with connection IDs that no longer exist)
    let orphanedCount = 0
    console.log('[Queue Cleanup] Checking waiting jobs for orphaned connections...')
    
    for (const job of waitingJobs) {
      try {
        const jobConnectionId = job.data?.connectionId
        if (jobConnectionId) {
          // If specific connectionIds provided, target those OR if connection doesn't exist
          const shouldRemove = connectionIds 
            ? connectionIds.includes(jobConnectionId)
            : !activeConnectionIds.has(jobConnectionId)
          
          if (shouldRemove) {
            console.log(`[Queue Cleanup] Removing orphaned job ${job.id} with connection ${jobConnectionId}`)
            await job.remove()
            orphanedCount++
          }
        }
      } catch (err) {
        console.warn(`[Queue Cleanup] Error removing job ${job.id}:`, err)
      }
    }
    
    console.log(`[Queue Cleanup] Removed ${orphanedCount} orphaned waiting jobs`)
    
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
      after: afterStats,
      orphanedJobsRemoved: orphanedCount,
      activeConnectionsFound: activeConnectionIds.size
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
