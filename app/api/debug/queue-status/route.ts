import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const brandId = url.searchParams.get('brandId') || '0da80e8f-2df3-468d-9053-08fa4d24e6e8'
    const action = url.searchParams.get('action')

    // Import queue service
    const { metaQueue } = await import('@/lib/services/metaQueueService')

    if (action === 'cleanup') {
      // Clean up orphaned jobs
      const waiting = await metaQueue.getWaiting()
      const active = await metaQueue.getActive()
      let cleanedCount = 0

      // Check Supabase for valid connections
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = createClient()

      // Get all valid Meta connections
      const { data: validConnections } = await supabase
        .from('platform_connections')
        .select('id')
        .eq('platform_type', 'meta')
        .eq('status', 'active')

      const validConnectionIds = new Set(validConnections?.map(c => c.id) || [])

      // Clean waiting jobs
      for (const job of waiting) {
        if (job.data?.connectionId && !validConnectionIds.has(job.data.connectionId)) {
          await metaQueue.remove(job.id)
          console.log(`[Queue Cleanup] Removed orphaned job ${job.id} with invalid connection ${job.data.connectionId}`)
          cleanedCount++
        }
      }

      // Clean active jobs
      for (const job of active) {
        if (job.data?.connectionId && !validConnectionIds.has(job.data.connectionId)) {
          await metaQueue.remove(job.id)
          console.log(`[Queue Cleanup] Removed orphaned active job ${job.id} with invalid connection ${job.data.connectionId}`)
          cleanedCount++
        }
      }

      return NextResponse.json({
        success: true,
        message: `Cleaned up ${cleanedCount} orphaned jobs`,
        cleanedCount
      })
    }

    // Get queue stats
    const waiting = await metaQueue.getWaiting()
    const active = await metaQueue.getActive()
    const completed = await metaQueue.getCompleted()
    const failed = await metaQueue.getFailed()

    // Filter for our brand
    const brandWaiting = waiting.filter(job => job.data?.brandId === brandId)
    const brandActive = active.filter(job => job.data?.brandId === brandId)
    const brandCompleted = completed.filter(job => job.data?.brandId === brandId).slice(0, 5)
    const brandFailed = failed.filter(job => job.data?.brandId === brandId).slice(0, 5)
    
    // Sample job data
    const waitingSample = brandWaiting.slice(0, 3).map(job => ({
      id: job.id,
      name: job.name,
      connectionId: job.data?.connectionId,
      attempts: job.attemptsMade,
      delay: job.delay,
      processedOn: job.processedOn,
      timestamp: job.timestamp
    }))
    
    const failedSample = brandFailed.map(job => ({
      id: job.id,
      name: job.name,
      connectionId: job.data?.connectionId,
      error: job.failedReason,
      attempts: job.attemptsMade,
      failedAt: job.finishedOn
    }))
    
    return NextResponse.json({
      success: true,
      brandId,
      queue: {
        waiting: {
          total: waiting.length,
          brand: brandWaiting.length,
          sample: waitingSample
        },
        active: {
          total: active.length,
          brand: brandActive.length
        },
        completed: {
          total: completed.length,
          brand: brandCompleted.length
        },
        failed: {
          total: failed.length,
          brand: brandFailed.length,
          sample: failedSample
        }
      },
      lastWorkerRun: 'Check Vercel logs for /api/cron/process-queue',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
