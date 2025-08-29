import { NextRequest, NextResponse } from 'next/server'

/**
 * Manual worker endpoint for processing Shopify queue jobs
 * This replaces the background worker for Vercel compatibility
 */
export async function POST(request: NextRequest) {
  const workerApiId = `worker_api_${Date.now()}`
  
  console.log(`🔧 [WORKER-API-${workerApiId}] ===== WORKER API CALLED =====`)
  console.log(`🔧 [WORKER-API-${workerApiId}] Timestamp: ${new Date().toISOString()}`)
  console.log(`🔧 [WORKER-API-${workerApiId}] Request URL: ${request.url}`)
  
  try {
    console.log(`🔧 [WORKER-API-${workerApiId}] Starting job processing...`)
    
    // Auth disabled for debugging
    const internalCall = request.headers.get('x-internal-call') === 'true'
    console.log(`🔧 [WORKER-API-${workerApiId}] Internal call: ${internalCall}`)
    
    // Get the number of jobs to process (default: 10)
    const body = await request.json().catch(() => ({}))
    const maxJobs = body.maxJobs || 10
    const syncId = body.sync_id
    
    console.log(`🔧 [WORKER-API-${workerApiId}] Parameters:`)
    console.log(`🔧 [WORKER-API-${workerApiId}] - Max Jobs: ${maxJobs}`)
    console.log(`🔧 [WORKER-API-${workerApiId}] - Sync ID: ${syncId || 'NONE'}`)
    console.log(`🔧 [WORKER-API-${workerApiId}] - Request Body:`, JSON.stringify(body, null, 2))
    
    // Import dependencies inside try block to catch import errors
    console.log(`📦 [WORKER-API-${workerApiId}] Importing worker dependencies...`)
    const { ShopifyWorker } = await import('@/lib/workers/shopifyWorker')
    const { shopifyQueue } = await import('@/lib/services/shopifyQueueService')
    console.log(`✅ [WORKER-API-${workerApiId}] Dependencies imported successfully`)
    
    // Process waiting jobs
    let processedCount = 0
    const results = []
    
    // Check for jobs in different states
    console.log(`🔍 [WORKER-API-${workerApiId}] Checking queue status...`)
    const waitingJobs = await shopifyQueue.getWaiting()
    const activeJobs = await shopifyQueue.getActive()
    
    console.log(`📊 [WORKER-API-${workerApiId}] Queue status:`)
    console.log(`📊 [WORKER-API-${workerApiId}] - Waiting jobs: ${waitingJobs.length}`)
    console.log(`📊 [WORKER-API-${workerApiId}] - Active jobs: ${activeJobs.length}`)
    console.log(`📊 [WORKER-API-${workerApiId}] - Will process: ${Math.min(waitingJobs.length, maxJobs)} jobs`)
    
    // Process waiting jobs
    for (let i = 0; i < Math.min(waitingJobs.length, maxJobs); i++) {
      const job = waitingJobs[i]
      const jobProcessId = `job_${job.id}_${Date.now()}`
      
      console.log(`⚙️ [WORKER-API-${workerApiId}] [JOB-${jobProcessId}] Processing job ${i + 1}/${Math.min(waitingJobs.length, maxJobs)}`)
      console.log(`⚙️ [WORKER-API-${workerApiId}] [JOB-${jobProcessId}] - Job ID: ${job.id}`)
      console.log(`⚙️ [WORKER-API-${workerApiId}] [JOB-${jobProcessId}] - Job Type: ${job.name}`)
      console.log(`⚙️ [WORKER-API-${workerApiId}] [JOB-${jobProcessId}] - Brand ID: ${job.data?.brandId || 'UNKNOWN'}`)
      console.log(`⚙️ [WORKER-API-${workerApiId}] [JOB-${jobProcessId}] - Shop: ${job.data?.shop || 'UNKNOWN'}`)
      console.log(`⚙️ [WORKER-API-${workerApiId}] [JOB-${jobProcessId}] - Attempts: ${job.attemptsMade + 1}/${job.opts.attempts}`)
      
      const jobStart = Date.now()
      
      try {
        console.log(`🚀 [WORKER-API-${workerApiId}] [JOB-${jobProcessId}] Starting job processing...`)
        
        // Process the job based on its type
        switch (job.name) {
          case 'recent_sync':
            console.log(`📊 [WORKER-API-${workerApiId}] [JOB-${jobProcessId}] Calling ShopifyWorker.processRecentSync()`)
            await ShopifyWorker.processRecentSync(job)
            break
          case 'bulk_orders':
            console.log(`📦 [WORKER-API-${workerApiId}] [JOB-${jobProcessId}] Calling ShopifyWorker.processBulkOrders()`)
            await ShopifyWorker.processBulkOrders(job)
            break
          case 'bulk_customers':
            console.log(`👥 [WORKER-API-${workerApiId}] [JOB-${jobProcessId}] Calling ShopifyWorker.processBulkCustomers()`)
            await ShopifyWorker.processBulkCustomers(job)
            break
          case 'bulk_products':
            console.log(`🛍️ [WORKER-API-${workerApiId}] [JOB-${jobProcessId}] Calling ShopifyWorker.processBulkProducts()`)
            await ShopifyWorker.processBulkProducts(job)
            break
          case 'poll_bulk':
            console.log(`⏰ [WORKER-API-${workerApiId}] [JOB-${jobProcessId}] Calling ShopifyWorker.processPollBulk()`)
            await ShopifyWorker.processPollBulk(job)
            break
          default:
            console.error(`❌ [WORKER-API-${workerApiId}] [JOB-${jobProcessId}] Unknown job type: ${job.name}`)
            continue
        }
        
        // Mark job as completed
        console.log(`✅ [WORKER-API-${workerApiId}] [JOB-${jobProcessId}] Marking job as completed...`)
        await job.finished()
        processedCount++
        
        const jobTime = Date.now() - jobStart
        console.log(`✅ [WORKER-API-${workerApiId}] [JOB-${jobProcessId}] Job completed successfully in ${jobTime}ms`)
        
        results.push({
          jobId: job.id,
          type: job.name,
          status: 'completed',
          brandId: job.data.brandId,
          processing_time_ms: jobTime,
          job_process_id: jobProcessId
        })
        
      } catch (error) {
        const jobTime = Date.now() - jobStart
        console.error(`❌ [WORKER-API-${workerApiId}] [JOB-${jobProcessId}] Job failed after ${jobTime}ms:`, error)
        console.error(`❌ [WORKER-API-${workerApiId}] [JOB-${jobProcessId}] Error stack:`, error instanceof Error ? error.stack : 'No stack trace')
        
        // Mark job as failed
        await job.moveToFailed({ message: error instanceof Error ? error.message : 'Unknown error' })
        
        results.push({
          jobId: job.id,
          type: job.name,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          brandId: job.data.brandId,
          processing_time_ms: jobTime,
          job_process_id: jobProcessId
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
    
    console.log(`📊 [WORKER-API-${workerApiId}] Final queue statistics:`, stats)
    console.log(`🎉 [WORKER-API-${workerApiId}] ===== WORKER API COMPLETED =====`)
    console.log(`📊 [WORKER-API-${workerApiId}] Jobs processed: ${processedCount}`)
    console.log(`📊 [WORKER-API-${workerApiId}] Success rate: ${results.filter(r => r.status === 'completed').length}/${results.length}`)
    
    return NextResponse.json({
      success: true,
      message: `Processed ${processedCount} jobs`,
      processedCount,
      results,
      queueStats: stats,
      worker_api_id: workerApiId,
      timing: {
        total_time_ms: Date.now() - parseInt(workerApiId.split('_')[2]),
        jobs_processed: processedCount
      }
    })
    
  } catch (error) {
    console.error(`❌ [WORKER-API-${workerApiId}] FATAL ERROR in worker API:`, error)
    console.error(`❌ [WORKER-API-${workerApiId}] Error stack:`, error instanceof Error ? error.stack : 'No stack trace')
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      worker_api_id: workerApiId,
      details: error instanceof Error ? error.stack : 'No details'
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
