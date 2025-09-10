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
    const { MetaWorker } = await import('@/lib/workers/metaWorker')
    const { shopifyQueue } = await import('@/lib/services/shopifyQueueService')
    const { metaQueue } = await import('@/lib/services/metaQueueService')
    
    // Initialize Meta worker
    MetaWorker.initialize()
    
    // Process waiting jobs
    let processedCount = 0
    const results = []
    
    // Get waiting jobs from both queues
    const shopifyWaiting = await shopifyQueue.getWaiting()
    const shopifyActive = await shopifyQueue.getActive()
    const metaWaiting = await metaQueue.getWaiting()
    const metaActive = await metaQueue.getActive()
    
    console.log(`[Public Worker] Shopify: ${shopifyWaiting.length} waiting, ${shopifyActive.length} active`)
    console.log(`[Public Worker] Meta: ${metaWaiting.length} waiting, ${metaActive.length} active`)
    
    // Combine jobs (prioritize Meta since it's been stuck)
    const allWaitingJobs = [...metaWaiting, ...shopifyWaiting]
    const totalActive = shopifyActive.length + metaActive.length
    
    // Process waiting jobs
    for (let i = 0; i < Math.min(allWaitingJobs.length, maxJobs); i++) {
      const job = allWaitingJobs[i]
      
      try {
        console.log(`[Public Worker] Processing ${job.name} job ${job.id}`)
        
        // Determine if this is a Meta or Shopify job
        const isMetaJob = metaWaiting.includes(job)
        console.log(`[Public Worker] Job ${job.id} is ${isMetaJob ? 'Meta' : 'Shopify'} job`)
        
        // Process the job based on its type and origin
        if (isMetaJob) {
          // Meta jobs
          switch (job.name) {
            case 'recent_sync':
              await MetaWorker.processRecentSync(job)
              break
            case 'historical_campaigns':
              await MetaWorker.processHistoricalCampaigns(job)
              break
            case 'historical_demographics':
              await MetaWorker.processHistoricalDemographics(job)
              break
            case 'historical_insights':
              await MetaWorker.processHistoricalInsights(job)
              break
            case 'daily_sync':
              await MetaWorker.processDailySync(job)
              break
            case 'reconcile':
              await MetaWorker.processReconcile(job)
              break
            default:
              console.warn(`[Public Worker] Unknown Meta job type: ${job.name}`)
              await metaQueue.moveToFailed(job.id, new Error(`Unknown Meta job type: ${job.name}`))
              continue
          }
        } else {
          // Shopify jobs
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
              console.warn(`[Public Worker] Unknown Shopify job type: ${job.name}`)
              await shopifyQueue.moveToFailed(job.id, new Error(`Unknown Shopify job type: ${job.name}`))
              continue
          }
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
      waiting: allWaitingJobs.length - processedCount,
      active: totalActive,
      shopify: {
        waiting: shopifyWaiting.length,
        active: shopifyActive.length
      },
      meta: {
        waiting: metaWaiting.length,
        active: metaActive.length
      },
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
