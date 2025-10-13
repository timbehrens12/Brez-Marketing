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
    const maxJobs = body.maxJobs || 8  // Balanced for performance vs stability
    
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
    
    // Also check for new demographics jobs in the dedicated table
    const { getSupabaseClient } = await import('@/lib/supabase/client')
    const supabase = getSupabaseClient()
    
    const { data: demographicsJobs, error: demoError } = await supabase
      .from('meta_demographics_jobs_ledger_v2')
      .select('job_key, brand_id, request_metadata')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(Math.min(6, maxJobs)) // Process up to 6 demographics jobs per run
    
    const demographicsWaiting = demographicsJobs?.length || 0
    
    // Get waiting jobs from both queues
    const shopifyWaiting = await shopifyQueue.getWaiting()
    const shopifyActive = await shopifyQueue.getActive()
    const metaWaiting = await metaQueue.getWaiting()
    const metaActive = await metaQueue.getActive()
    
    console.log(`[Public Worker] Shopify: ${shopifyWaiting.length} waiting, ${shopifyActive.length} active`)
    console.log(`[Public Worker] Meta: ${metaWaiting.length} waiting, ${metaActive.length} active`)
    console.log(`[Public Worker] Demographics: ${demographicsWaiting} waiting`)
    
    // Combine jobs (prioritize Demographics > Meta > Shopify)
    const allWaitingJobs = [...metaWaiting, ...shopifyWaiting]
    const totalActive = shopifyActive.length + metaActive.length
    
    // First, process demographics jobs (highest priority) - Process in parallel
    if (demographicsJobs && demographicsJobs.length > 0 && processedCount < maxJobs) {
      const MetaDemographicsService = (await import('@/lib/services/metaDemographicsService')).default
      const demographicsService = new MetaDemographicsService()
      
      const jobsToProcess = demographicsJobs.slice(0, Math.min(6, maxJobs - processedCount))
      
      // Process jobs in parallel with concurrency limit
      const concurrency = 2
      const chunks = []
      for (let i = 0; i < jobsToProcess.length; i += concurrency) {
        chunks.push(jobsToProcess.slice(i, i + concurrency))
      }
      
      for (const chunk of chunks) {
        const chunkResults = await Promise.allSettled(
          chunk.map(async demoJob => {
            console.log(`[Public Worker] Processing demographics job ${demoJob.job_key}`)
            
            let result
            if (demoJob.request_metadata?.trigger_full_sync) {
              result = await demographicsService.processTriggerJob(demoJob.job_key)
            } else {
              result = await demographicsService.processJob(demoJob.job_key)
            }
            
            return { job: demoJob, result }
          })
        )
        
        for (const chunkResult of chunkResults) {
          if (chunkResult.status === 'fulfilled') {
            const { job, result } = chunkResult.value
            if (result.success) {
              results.push({ type: 'demographics', job: job.job_key, success: true, rowsProcessed: result.rowsProcessed })
            } else {
              results.push({ type: 'demographics', job: job.job_key, success: false, error: result.error })
            }
          } else {
            console.error(`[Public Worker] Demographics job failed:`, chunkResult.reason)
            results.push({ type: 'demographics', job: 'unknown', success: false, error: chunkResult.reason })
          }
          processedCount++
        }
      }
    }
    
    // Then process other jobs if we haven't reached maxJobs
    // 🚀 PARALLEL PROCESSING: Process jobs in parallel with concurrency limit for 5x faster performance
    const jobsToProcess = allWaitingJobs.slice(0, Math.min(allWaitingJobs.length, maxJobs - processedCount))
    const concurrency = 5 // Process 5 jobs in parallel (5x faster than sequential)
    
    console.log(`[Public Worker] 🚀 Processing ${jobsToProcess.length} jobs with concurrency ${concurrency}`)
    
    // Split jobs into chunks for parallel processing
    for (let i = 0; i < jobsToProcess.length; i += concurrency) {
      const chunk = jobsToProcess.slice(i, i + concurrency)
      console.log(`[Public Worker] Processing chunk ${Math.floor(i / concurrency) + 1}/${Math.ceil(jobsToProcess.length / concurrency)} (${chunk.length} jobs)`)
      
      // Process this chunk in parallel
      const chunkResults = await Promise.allSettled(
        chunk.map(async (job) => {
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
                  throw new Error(`Unknown Meta job type: ${job.name}`)
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
                  throw new Error(`Unknown Shopify job type: ${job.name}`)
              }
            }
            
            return {
              id: job.id,
              name: job.name,
              status: 'completed'
            }
          } catch (error) {
            console.error(`[Public Worker] Error processing job ${job.id}:`, error)
            return {
              id: job.id,
              name: job.name,
              status: 'failed',
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          }
        })
      )
      
      // Collect results from this chunk
      for (const result of chunkResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value)
          if (result.value.status === 'completed') {
            processedCount++
          }
        } else {
          console.error(`[Public Worker] Job promise rejected:`, result.reason)
          results.push({
            id: 'unknown',
            name: 'unknown',
            status: 'failed',
            error: result.reason instanceof Error ? result.reason.message : String(result.reason)
          })
        }
      }
      
      console.log(`[Public Worker] ✅ Chunk complete - Processed: ${processedCount}/${jobsToProcess.length}`)
    }
    
    console.log(`[Public Worker] Processed ${processedCount} jobs`)
    
    return NextResponse.json({
      success: true,
      processed: processedCount,
      waiting: allWaitingJobs.length - processedCount + Math.max(0, demographicsWaiting - processedCount),
      active: totalActive,
      shopify: {
        waiting: shopifyWaiting.length,
        active: shopifyActive.length
      },
      meta: {
        waiting: metaWaiting.length,
        active: metaActive.length
      },
      demographics: {
        waiting: Math.max(0, demographicsWaiting - processedCount),
        processed: results.filter(r => r.type === 'demographics' && r.success).length
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
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const maxJobs = parseInt(url.searchParams.get('maxJobs') || '0') // Default to 0 instead of 10
  const action = url.searchParams.get('action')
  const brandId = url.searchParams.get('brandId')

  console.log(`[Public Worker] GET request - action: ${action}, brandId: ${brandId}, maxJobs: ${maxJobs}`)

  // Handle queue cleanup action FIRST
  if (action === 'cleanup' || (action === undefined && maxJobs === 0)) {
    console.log(`[Public Worker] Queue cleanup requested for brand ${brandId}`)
    console.log(`[Public Worker] Trigger condition: action=${action}, maxJobs=${maxJobs}`)

    try {
      // Import queue service
      const { metaQueue } = await import('@/lib/services/metaQueueService')

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
        cleanedCount,
        validConnections: validConnections?.length || 0
      })

    } catch (error) {
      console.error('[Public Worker] Cleanup error:', error)
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : 'Cleanup failed'
      }, { status: 500 })
    }
  }

  // Process jobs if explicitly requested (not for cleanup)
  if (maxJobs > 0 && action !== 'cleanup') {
    console.log(`[Public Worker] Processing ${maxJobs} jobs via GET request`)

    try {
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

      console.log(`[Public Worker] Processed ${processedCount} jobs via GET`)

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
        results,
        method: 'GET',
        maxJobs
      })
    } catch (error) {
      console.error('[Public Worker] Fatal error in GET:', error)
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          method: 'GET'
        },
        { status: 500 }
      )
    }
  }

  return NextResponse.json({
    status: 'ready',
    message: 'Public worker endpoint is ready (NO AUTH)',
    usage: {
      'Process jobs': '?maxJobs=N',
      'Cleanup orphaned jobs': '?action=cleanup&brandId=YOUR_BRAND_ID',
      'Get status': 'No params - returns this message'
    },
    timestamp: new Date().toISOString()
  })
}
