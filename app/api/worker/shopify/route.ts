import { NextRequest, NextResponse } from 'next/server'

/**
 * Manual worker endpoint for processing Shopify queue jobs
 * This replaces the background worker for Vercel compatibility
 */
export async function POST(request: NextRequest) {
  try {
    // Starting job processing
    
    // Auth disabled for debugging
    
    // COMPLETELY REMOVE ALL AUTH CHECKS
    // const authHeader = request.headers.get('authorization')
    // const internalCall = request.headers.get('x-internal-call') === 'true'
    // const cronSecret = process.env.CRON_SECRET

    // Get the number of jobs to process (default: 10)
    const body = await request.json().catch(() => ({}))
    const maxJobs = body.maxJobs || 10
    
    // Processing jobs
    
    // Import dependencies inside try block to catch import errors
    const { ShopifyWorker } = await import('@/lib/workers/shopifyWorker')
    const { shopifyQueue } = await import('@/lib/services/shopifyQueueService')
    
    // Process waiting jobs
    let processedCount = 0
    const results = []
    
    // Check for jobs in different states
    const waitingJobs = await shopifyQueue.getWaiting()
    const activeJobs = await shopifyQueue.getActive()
    
    // Found waiting and active jobs
    
    // Process waiting jobs
    for (let i = 0; i < Math.min(waitingJobs.length, maxJobs); i++) {
      const job = waitingJobs[i]
      
      try {
        // Processing job
        
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
            // Unknown job type
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
        
        // Job completed successfully
        
      } catch (error) {
        // Job failed
        
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
    
    // Processing complete
    
    return NextResponse.json({
      success: true,
      message: `Processed ${processedCount} jobs`,
      processedCount,
      results,
      queueStats: stats
    })
    
  } catch (error) {
    // Error processing jobs
    
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
    // GET request for queue status
    
    // GET auth disabled for debugging
    
    // COMPLETELY REMOVE ALL AUTH CHECKS
    // const internalCall = request.headers.get('x-internal-call') === 'true'
    
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
    // Error getting queue status
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
