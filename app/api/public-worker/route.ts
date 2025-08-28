import { NextRequest, NextResponse } from 'next/server'

/**
 * PUBLIC worker endpoint - NO AUTH REQUIRED
 * Alternative endpoint for processing queue jobs
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[Public Worker] Request received - NO AUTH CHECK')
    
    // Get the number of jobs to process
    const body = await request.json().catch(() => ({}))
    const maxJobs = body.maxJobs || 10
    
    console.log(`[Public Worker] Processing up to ${maxJobs} jobs`)
    
    // Import dependencies
    const { ShopifyWorker } = await import('@/lib/workers/shopifyWorker')
    const { shopifyQueue } = await import('@/lib/services/shopifyQueueService')
    
    // Process waiting jobs
    let processedCount = 0
    const results = []
    
    // Get waiting jobs
    const waitingJobs = await shopifyQueue.getWaiting()
    const activeJobs = await shopifyQueue.getActive()
    
    console.log(`[Public Worker] Found ${waitingJobs.length} waiting, ${activeJobs.length} active jobs`)
    
    // Process waiting jobs
    for (let i = 0; i < Math.min(waitingJobs.length, maxJobs); i++) {
      const job = waitingJobs[i]
      
      try {
        console.log(`[Public Worker] Processing ${job.name} job ${job.id}`)
        
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
          case 'real_time_order':
            await ShopifyWorker.processRealTimeOrder(job)
            break
          case 'real_time_customer':
            await ShopifyWorker.processRealTimeCustomer(job)
            break
          case 'real_time_product':
            await ShopifyWorker.processRealTimeProduct(job)
            break
          default:
            console.warn(`[Public Worker] Unknown job type: ${job.name}`)
            await shopifyQueue.moveToFailed(job.id, new Error(`Unknown job type: ${job.name}`))
            continue
        }
        
        results.push({
          id: job.id,
          name: job.name,
          status: 'completed'
        })
        processedCount++
      } catch (error) {
        console.error(`[Public Worker] Error processing job ${job.id}:`, error)
        results.push({
          id: job.id,
          name: job.name,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
    
    console.log(`[Public Worker] Processed ${processedCount} jobs`)
    
    return NextResponse.json({
      success: true,
      processed: processedCount,
      waiting: waitingJobs.length - processedCount,
      active: activeJobs.length,
      results
    })
  } catch (error) {
    console.error('[Public Worker] Fatal error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Also support GET for testing
export async function GET() {
  return NextResponse.json({
    status: 'ready',
    message: 'Public worker endpoint is ready (NO AUTH)',
    timestamp: new Date().toISOString()
  })
}
