import { NextRequest, NextResponse } from 'next/server'

/**
 * Manual worker endpoint for processing Shopify queue jobs
 * This replaces the background worker for Vercel compatibility
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[Worker API] Starting job processing...')
    
    // Check for authorization (optional - add API key if needed)
    const authHeader = request.headers.get('authorization')
    const internalCall = request.headers.get('x-internal-call') === 'true'
    const cronSecret = process.env.CRON_SECRET
    
    console.log(`[Worker API] Auth check: internalCall=${internalCall}, cronSecret=${!!cronSecret}, authHeader=${authHeader?.substring(0, 20)}...`)
    
    // TEMPORARILY DISABLE AUTH CHECK FOR DEBUGGING
    console.log(`[Worker API] TEMP: Skipping authorization check for debugging`)
    
    // Allow internal calls or valid cron secret
    // if (!internalCall && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    //   console.log(`[Worker API] Authorization failed`)
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }
    
    console.log(`[Worker API] Authorization passed (temp disabled)`)

    // Get the number of jobs to process (default: 10)
    const body = await request.json().catch(() => ({}))
    const maxJobs = body.maxJobs || 10
    
    console.log(`[Worker API] Processing up to ${maxJobs} jobs...`)
    
    // Import dependencies inside try block to catch import errors
    const { ShopifyWorker } = await import('@/lib/workers/shopifyWorker')
    const { shopifyQueue } = await import('@/lib/services/shopifyQueueService')
    
    // Process waiting jobs
    let processedCount = 0
    const results = []
    
    // Check for jobs in different states
    const waitingJobs = await shopifyQueue.getWaiting()
    const activeJobs = await shopifyQueue.getActive()
    
    console.log(`[Worker API] Found ${waitingJobs.length} waiting jobs, ${activeJobs.length} active jobs`)
    
    // Process waiting jobs
    for (let i = 0; i < Math.min(waitingJobs.length, maxJobs); i++) {
      const job = waitingJobs[i]
      
      try {
        console.log(`[Worker API] Processing job ${job.id} (${job.name})`)
        
        // Process the job based on its type
        switch (job.name) {
          case 'recent_sync':
            await ShopifyWorker.processRecentSync(job)
            break
          case 'bulk_orders':
            await ShopifyWorker.processBulkOrders(job)
            break
          case 'bulk_customers':
            await ShopifyWorker.processBulkCustomers(job)
            break
          case 'bulk_products':
            await ShopifyWorker.processBulkProducts(job)
            break
          case 'poll_bulk':
            await ShopifyWorker.processPollBulk(job)
            break
          default:
            console.warn(`[Worker API] Unknown job type: ${job.name}`)
            continue
        }
        
        // Mark job as completed
        await job.finished()
        processedCount++
        
        results.push({
          jobId: job.id,
          type: job.name,
          status: 'completed',
          brandId: job.data.brandId
        })
        
        console.log(`[Worker API] Job ${job.id} completed successfully`)
        
      } catch (error) {
        console.error(`[Worker API] Job ${job.id} failed:`, error)
        
        // Mark job as failed
        await job.moveToFailed({ message: error instanceof Error ? error.message : 'Unknown error' })
        
        results.push({
          jobId: job.id,
          type: job.name,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          brandId: job.data.brandId
        })
      }
    }
    
    // Get queue statistics
    const waiting = await shopifyQueue.getWaiting()
    const active = await shopifyQueue.getActive()
    const completed = await shopifyQueue.getCompleted()
    const failed = await shopifyQueue.getFailed()
    
    const stats = {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length
    }
    
    console.log(`[Worker API] Processing complete. Processed: ${processedCount}, Queue stats:`, stats)
    
    return NextResponse.json({
      success: true,
      message: `Processed ${processedCount} jobs`,
      processedCount,
      results,
      queueStats: stats
    })
    
  } catch (error) {
    console.error('[Worker API] Error processing jobs:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * GET endpoint to check queue status
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[Worker API] GET request for queue status...')
    
    // Check for authorization for GET requests too
    const internalCall = request.headers.get('x-internal-call') === 'true'
    
    console.log(`[Worker API] GET Auth check: internalCall=${internalCall}`)
    console.log(`[Worker API] GET TEMP: Skipping authorization check for debugging`)
    
    // Import dependencies inside try block to catch import errors
    const { shopifyQueue } = await import('@/lib/services/shopifyQueueService')
    
    const waiting = await shopifyQueue.getWaiting()
    const active = await shopifyQueue.getActive()
    const completed = await shopifyQueue.getCompleted()
    const failed = await shopifyQueue.getFailed()
    
    const stats = {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length
    }
    
    // Get sample of waiting jobs
    const waitingJobs = waiting.slice(0, 5).map(job => ({
      id: job.id,
      name: job.name,
      brandId: job.data.brandId,
      createdAt: job.timestamp
    }))
    
    return NextResponse.json({
      success: true,
      stats,
      waitingJobs,
      message: `Queue has ${stats.waiting} waiting jobs, ${stats.active} active jobs`
    })
    
  } catch (error) {
    console.error('[Worker API] Error getting queue status:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
