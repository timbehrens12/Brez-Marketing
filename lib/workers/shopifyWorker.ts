import { Job } from 'bull'
import { shopifyQueue, ShopifyJobType, ShopifyJobData, BulkJobData, ShopifyQueueService } from '@/lib/services/shopifyQueueService'
import { ShopifyGraphQLService } from '@/lib/services/shopifyGraphQLService'
import { ShopifyBulkService } from '@/lib/services/shopifyBulkService'
import { createClient } from '@/lib/supabase/server'

/**
 * Shopify Worker - Processes queue jobs
 */
export class ShopifyWorker {
  static initialize() {
    console.log('[Worker] Initializing Shopify worker...')
    
    // Process different job types
    shopifyQueue.process(ShopifyJobType.RECENT_SYNC, 5, this.processRecentSync.bind(this))
    shopifyQueue.process(ShopifyJobType.BULK_ORDERS, 1, this.processBulkOrders.bind(this))
    shopifyQueue.process(ShopifyJobType.BULK_CUSTOMERS, 1, this.processBulkCustomers.bind(this))
    shopifyQueue.process(ShopifyJobType.BULK_PRODUCTS, 1, this.processBulkProducts.bind(this))
    shopifyQueue.process(ShopifyJobType.POLL_BULK, 10, this.processPollBulk.bind(this))
    
    // Error handling
    shopifyQueue.on('error', (error) => {
      console.error('[Worker] Queue error:', error)
    })
    
    shopifyQueue.on('failed', (job, err) => {
      console.error(`[Worker] Job ${job.id} failed:`, err)
    })
    
    shopifyQueue.on('completed', (job) => {
      console.log(`[Worker] Job ${job.id} completed successfully`)
    })
    
    console.log('[Worker] Shopify worker initialized')
  }

  /**
   * Process recent sync job - FULL HISTORICAL SYNC IMMEDIATE START
   */
  static async processRecentSync(job: Job<ShopifyJobData>): Promise<void> {
    const { brandId, connectionId, shop, queue_job_id, sync_job_id } = job.data
    const workerId = `worker_${Date.now()}_${job.id}`

    console.log(`🚀 [WORKER-${workerId}] ===== PROCESSING RECENT SYNC JOB =====`)
    console.log(`🚀 [WORKER-${workerId}] Job ID: ${job.id}`)
    console.log(`🚀 [WORKER-${workerId}] Queue Job ID: ${queue_job_id || 'NONE'}`)
    console.log(`🚀 [WORKER-${workerId}] Sync Job ID: ${sync_job_id || 'NONE'}`)
    console.log(`🚀 [WORKER-${workerId}] Brand ID: ${brandId}`)
    console.log(`🚀 [WORKER-${workerId}] Connection ID: ${connectionId}`)
    console.log(`🚀 [WORKER-${workerId}] Shop: ${shop}`)
    console.log(`🚀 [WORKER-${workerId}] Job Attempts: ${job.attemptsMade + 1}/${job.opts.attempts}`)

    // Get fresh access token from database to avoid 401 errors
    console.log(`🔐 [WORKER-${workerId}] Getting fresh access token from database...`)
    const { accessToken, error: tokenError } = await this.getFreshAccessToken(connectionId)
    if (tokenError || !accessToken) {
      console.error(`❌ [WORKER-${workerId}] Failed to get access token:`, tokenError)
      throw new Error(`Failed to get fresh access token: ${tokenError || 'Token not found'}`)
    }
    
    console.log(`✅ [WORKER-${workerId}] Access token retrieved successfully`)
    console.log(`🔐 [WORKER-${workerId}] Token length: ${accessToken.length} characters`)

    // Create ETL job record
    console.log(`💾 [WORKER-${workerId}] Creating ETL job record...`)
    const etlJobId = await ShopifyQueueService.createEtlJob(
      brandId,
      'recent_sync',
      ShopifyJobType.RECENT_SYNC
    )
    console.log(`✅ [WORKER-${workerId}] ETL job created with ID: ${etlJobId}`)

    try {
      // Update job status to running
      console.log(`💾 [WORKER-${workerId}] Updating ETL job status to 'running'...`)
      await ShopifyQueueService.updateEtlJob(etlJobId, {
        status: 'running'
      })
      console.log(`✅ [WORKER-${workerId}] ETL job status updated to 'running'`)

      // SKIP QUICK SYNC - GO STRAIGHT TO FULL HISTORICAL BULK OPERATIONS
      console.log(`⏭️ [WORKER-${workerId}] SKIPPING quick sync - proceeding directly to FULL HISTORICAL bulk operations`)
      console.log(`📊 [WORKER-${workerId}] This will sync ALL data from 2010 onwards`)

      // STEP 2: Now start FULL HISTORICAL bulk operations
      console.log(`📋 [WORKER-${workerId}] STEP 2: Starting FULL HISTORICAL bulk operations`)
      console.log(`🎯 [WORKER-${workerId}] Strategy: Sequential bulk operations (Shopify limitation)`)

      // Skip bulk operation check - always proceed with sync
      // This ensures we always try to sync all data
      console.log(`🚀 [WORKER-${workerId}] Proceeding with full historical sync for brand ${brandId}`)

      // Start FIRST bulk operation only (Shopify allows only 1 at a time)
      console.log(`📦 [WORKER-${workerId}] Starting ORDERS bulk operation (1/3 - sequential processing)...`)
      
      try {
        console.log(`📦 [WORKER-${workerId}] 1/3: Initiating orders bulk operation...`)
        await this.startBulkOperation('orders', brandId, connectionId, shop, accessToken, workerId)
        console.log(`✅ [WORKER-${workerId}] Orders bulk operation started successfully`)
        console.log(`📋 [WORKER-${workerId}] Next: Customers and Products will start automatically after Orders completes`)
      } catch (ordersError) {
        console.error(`❌ [WORKER-${workerId}] Orders bulk operation FAILED:`, ordersError)
        console.error(`❌ [WORKER-${workerId}] Orders error stack:`, ordersError instanceof Error ? ordersError.stack : 'No stack trace')
        throw ordersError // Fail the whole sync if first operation fails
      }

      // Mark recent sync job as completed (no rows written since we skipped quick sync)
      console.log(`💾 [WORKER-${workerId}] Marking recent sync ETL job as completed...`)
      await ShopifyQueueService.updateEtlJob(etlJobId, {
        status: 'completed',
        completed_at: new Date().toISOString(),
        rows_written: 0 // No rows written (skipped quick sync)
      })
      console.log(`✅ [WORKER-${workerId}] Recent sync ETL job marked as completed`)

      console.log(`🎉 [WORKER-${workerId}] ===== FULL HISTORICAL SYNC INITIATED =====`)
      console.log(`📊 [WORKER-${workerId}] Scope: ALL data from 2010 onwards`)
      console.log(`⚡ [WORKER-${workerId}] Strategy: NO QUICK SYNC - Direct to bulk operations`)

    } catch (error) {
      console.error(`❌ [WORKER-${workerId}] Full historical sync failed for brand ${brandId}:`, error)
      console.error(`❌ [WORKER-${workerId}] Error stack:`, error instanceof Error ? error.stack : 'No stack trace')

      console.log(`💾 [WORKER-${workerId}] Updating ETL job status to 'failed'...`)
      await ShopifyQueueService.updateEtlJob(etlJobId, {
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        completed_at: new Date().toISOString()
      })
      console.log(`✅ [WORKER-${workerId}] ETL job marked as failed`)

      throw error
    }
  }

  /**
   * Helper to start a bulk operation with proper error handling
   */
  private static async startBulkOperation(
    entity: 'orders' | 'customers' | 'products',
    brandId: string,
    connectionId: string,
    shop: string,
    accessToken: string,
    parentWorkerId?: string
  ): Promise<void> {
    const bulkOpId = `bulk_${entity}_${Date.now()}`
    const logPrefix = parentWorkerId ? `[WORKER-${parentWorkerId}]` : `[BULK-${bulkOpId}]`
    
    console.log(`📦 ${logPrefix} ===== STARTING BULK OPERATION =====`)
    console.log(`📦 ${logPrefix} Entity: ${entity.toUpperCase()}`)
    console.log(`📦 ${logPrefix} Brand ID: ${brandId}`)
    console.log(`📦 ${logPrefix} Shop: ${shop}`)
    console.log(`📦 ${logPrefix} Bulk Op ID: ${bulkOpId}`)
    
    try {
      console.log(`💾 ${logPrefix} Creating ETL job for bulk ${entity} export...`)

      // Create ETL job for this bulk operation
      const etlJobId = await ShopifyQueueService.createEtlJob(
        brandId,
        entity,
        entity === 'orders' ? ShopifyJobType.BULK_ORDERS :
        entity === 'customers' ? ShopifyJobType.BULK_CUSTOMERS :
        ShopifyJobType.BULK_PRODUCTS
      )
      console.log(`✅ ${logPrefix} ETL job created with ID: ${etlJobId}`)

      console.log(`💾 ${logPrefix} Updating ETL job status to 'running'...`)
      await ShopifyQueueService.updateEtlJob(etlJobId, { status: 'running' })
      console.log(`✅ ${logPrefix} ETL job status updated to 'running'`)

      // Start the bulk operation
      console.log(`🚀 ${logPrefix} Starting Shopify GraphQL bulk ${entity} export (2010-01-01 onwards)...`)
      let bulkOp
      if (entity === 'orders') {
        console.log(`📊 ${logPrefix} Calling ShopifyGraphQLService.startBulkOrdersExport()...`)
        bulkOp = await ShopifyGraphQLService.startBulkOrdersExport(shop, accessToken, '2010-01-01')
      } else if (entity === 'customers') {
        console.log(`👥 ${logPrefix} Calling ShopifyGraphQLService.startBulkCustomersExport()...`)
        bulkOp = await ShopifyGraphQLService.startBulkCustomersExport(shop, accessToken, '2010-01-01')
      } else {
        console.log(`📦 ${logPrefix} Calling ShopifyGraphQLService.startBulkProductsExport()...`)
        bulkOp = await ShopifyGraphQLService.startBulkProductsExport(shop, accessToken, '2010-01-01')
      }

      console.log(`✅ ${logPrefix} Bulk operation created:`)
      console.log(`📋 ${logPrefix} - Bulk Operation ID: ${bulkOp.id}`)
      console.log(`📋 ${logPrefix} - Status: ${bulkOp.status}`)
      console.log(`📋 ${logPrefix} - Created At: ${bulkOp.createdAt}`)

      // Update ETL job with bulk operation ID
      console.log(`💾 ${logPrefix} Updating ETL job with Shopify bulk operation ID...`)
      await ShopifyQueueService.updateEtlJob(etlJobId, {
        shopify_bulk_id: bulkOp.id
      })
      console.log(`✅ ${logPrefix} ETL job updated with bulk operation ID: ${bulkOp.id}`)

      // Schedule polling job
      const jobType = entity === 'orders' ? ShopifyJobType.BULK_ORDERS :
                     entity === 'customers' ? ShopifyJobType.BULK_CUSTOMERS :
                     ShopifyJobType.BULK_PRODUCTS

      console.log(`⏰ ${logPrefix} Scheduling polling job for bulk operation...`)
      await ShopifyQueueService.addPollBulkJob({
        brandId,
        connectionId,
        shop,
        accessToken,
        bulkOperationId: bulkOp.id,
        entity,
        jobType: ShopifyJobType.POLL_BULK,
        metadata: { etlJobId, bulk_op_id: bulkOpId }
      } as any)

      console.log(`✅ ${logPrefix} Bulk ${entity} export started successfully`)
      console.log(`📋 ${logPrefix} - Shopify Bulk ID: ${bulkOp.id}`)
      console.log(`📋 ${logPrefix} - Polling job scheduled`)
      console.log(`📋 ${logPrefix} - ETL Job ID: ${etlJobId}`)

    } catch (error) {
      console.error(`❌ ${logPrefix} Failed to start bulk ${entity} export:`, error)
      console.error(`❌ ${logPrefix} Error stack:`, error instanceof Error ? error.stack : 'No stack trace')
      throw error
    }
  }

  /**
   * Process bulk orders export
   */
  static async processBulkOrders(job: Job<ShopifyJobData>): Promise<void> {
    const { brandId, connectionId, shop } = job.data
    
    // Get fresh access token from database to avoid 401 errors
    const { accessToken, error: tokenError } = await this.getFreshAccessToken(connectionId)
    if (tokenError || !accessToken) {
      throw new Error(`Failed to get fresh access token: ${tokenError || 'Token not found'}`)
    }
    
    console.log(`[Worker] Starting bulk orders export for brand ${brandId}`)
    
    // Create ETL job record
    const etlJobId = await ShopifyQueueService.createEtlJob(
      brandId,
      'orders',
      ShopifyJobType.BULK_ORDERS
    )
    
    try {
      // Update job status to running
      await ShopifyQueueService.updateEtlJob(etlJobId, {
        status: 'running'
      })

      // Check for existing bulk operations to avoid conflicts
      const existingOp = await ShopifyGraphQLService.checkExistingBulkOperation(shop, accessToken)
      if (existingOp && (existingOp.status === 'RUNNING' || existingOp.status === 'CREATED')) {
        console.log(`[Worker] Bulk operation already running (${existingOp.id}), queuing orders job to retry later`)

        // Re-queue this job to try again in 2 minutes
        await ShopifyQueueService.addJob(ShopifyJobType.BULK_ORDERS, job.data, {
          delay: 2 * 60 * 1000, // 2 minutes
          priority: 5
        })

        return
      }

      // Start bulk export
      const bulkOp = await ShopifyGraphQLService.startBulkOrdersExport(shop, accessToken)

      // Update with bulk operation ID
      await ShopifyQueueService.updateEtlJob(etlJobId, {
        shopify_bulk_id: bulkOp.id
      })

      // Schedule polling job
      await ShopifyQueueService.addPollBulkJob({
        ...job.data,
        bulkOperationId: bulkOp.id,
        entity: 'orders',
        jobType: ShopifyJobType.POLL_BULK,
        metadata: { etlJobId }
      } as BulkJobData)

      console.log(`[Worker] Bulk orders export started with ID ${bulkOp.id}`)

    } catch (error) {
      console.error(`[Worker] Bulk orders export failed for brand ${brandId}:`, error)
      
      await ShopifyQueueService.updateEtlJob(etlJobId, {
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        completed_at: new Date().toISOString()
      })
      
      throw error
    }
  }

  /**
   * Process bulk customers export
   */
  static async processBulkCustomers(job: Job<ShopifyJobData>): Promise<void> {
    const { brandId, connectionId, shop } = job.data
    
    // Get fresh access token from database to avoid 401 errors
    const { accessToken, error: tokenError } = await this.getFreshAccessToken(connectionId)
    if (tokenError || !accessToken) {
      throw new Error(`Failed to get fresh access token: ${tokenError || 'Token not found'}`)
    }
    
    console.log(`[Worker] Starting bulk customers export for brand ${brandId}`)
    
    const etlJobId = await ShopifyQueueService.createEtlJob(
      brandId,
      'customers',
      ShopifyJobType.BULK_CUSTOMERS
    )
    
    try {
      await ShopifyQueueService.updateEtlJob(etlJobId, {
        status: 'running'
      })

      // Check for existing bulk operations to avoid conflicts
      const existingOp = await ShopifyGraphQLService.checkExistingBulkOperation(shop, accessToken)
      if (existingOp && (existingOp.status === 'RUNNING' || existingOp.status === 'CREATED')) {
        console.log(`[Worker] Bulk operation already running (${existingOp.id}), queuing customers job to retry later`)

        // Re-queue this job to try again in 2 minutes
        await ShopifyQueueService.addJob(ShopifyJobType.BULK_CUSTOMERS, job.data, {
          delay: 2 * 60 * 1000, // 2 minutes
          priority: 4
        })

        return
      }

      const bulkOp = await ShopifyGraphQLService.startBulkCustomersExport(shop, accessToken)

      await ShopifyQueueService.updateEtlJob(etlJobId, {
        shopify_bulk_id: bulkOp.id
      })

      await ShopifyQueueService.addPollBulkJob({
        ...job.data,
        bulkOperationId: bulkOp.id,
        entity: 'customers',
        jobType: ShopifyJobType.POLL_BULK,
        metadata: { etlJobId }
      } as BulkJobData)

      console.log(`[Worker] Bulk customers export started with ID ${bulkOp.id}`)

    } catch (error) {
      console.error(`[Worker] Bulk customers export failed:`, error)
      
      await ShopifyQueueService.updateEtlJob(etlJobId, {
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        completed_at: new Date().toISOString()
      })
      
      throw error
    }
  }

  /**
   * Process bulk products export
   */
  static async processBulkProducts(job: Job<ShopifyJobData>): Promise<void> {
    const { brandId, connectionId, shop } = job.data
    
    // Get fresh access token from database to avoid 401 errors
    const { accessToken, error: tokenError } = await this.getFreshAccessToken(connectionId)
    if (tokenError || !accessToken) {
      throw new Error(`Failed to get fresh access token: ${tokenError || 'Token not found'}`)
    }
    
    console.log(`[Worker] Starting bulk products export for brand ${brandId}`)
    
    const etlJobId = await ShopifyQueueService.createEtlJob(
      brandId,
      'products',
      ShopifyJobType.BULK_PRODUCTS
    )
    
    try {
      await ShopifyQueueService.updateEtlJob(etlJobId, {
        status: 'running'
      })

      // Check for existing bulk operations to avoid conflicts
      const existingOp = await ShopifyGraphQLService.checkExistingBulkOperation(shop, accessToken)
      if (existingOp && (existingOp.status === 'RUNNING' || existingOp.status === 'CREATED')) {
        console.log(`[Worker] Bulk operation already running (${existingOp.id}), queuing products job to retry later`)

        // Re-queue this job to try again in 2 minutes
        await ShopifyQueueService.addJob(ShopifyJobType.BULK_PRODUCTS, job.data, {
          delay: 2 * 60 * 1000, // 2 minutes
          priority: 3
        })

        return
      }

      const bulkOp = await ShopifyGraphQLService.startBulkProductsExport(shop, accessToken)

      await ShopifyQueueService.updateEtlJob(etlJobId, {
        shopify_bulk_id: bulkOp.id
      })

      await ShopifyQueueService.addPollBulkJob({
        ...job.data,
        bulkOperationId: bulkOp.id,
        entity: 'products',
        jobType: ShopifyJobType.POLL_BULK,
        metadata: { etlJobId }
      } as BulkJobData)

      console.log(`[Worker] Bulk products export started with ID ${bulkOp.id}`)

    } catch (error) {
      console.error(`[Worker] Bulk products export failed:`, error)
      
      await ShopifyQueueService.updateEtlJob(etlJobId, {
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        completed_at: new Date().toISOString()
      })
      
      throw error
    }
  }

  /**
   * Poll bulk operation status and process results when complete
   */
  static async processPollBulk(job: Job<BulkJobData>): Promise<void> {
    const { brandId, connectionId, shop, bulkOperationId, entity, metadata } = job.data
    
    // Get fresh access token from database to avoid 401 errors
    const { accessToken, error: tokenError } = await this.getFreshAccessToken(connectionId)
    if (tokenError || !accessToken) {
      throw new Error(`Failed to get fresh access token: ${tokenError || 'Token not found'}`)
    }
    const etlJobId = metadata?.etlJobId
    
    console.log(`[Worker] Polling bulk operation ${bulkOperationId} for ${entity}`)
    
    try {
      // Check bulk operation status
      const bulkOp = await ShopifyGraphQLService.getCurrentBulkOperation(shop, accessToken)
      
      if (!bulkOp || bulkOp.id !== bulkOperationId) {
        throw new Error(`Bulk operation ${bulkOperationId} not found`)
      }
      
      if (bulkOp.status === 'RUNNING' || bulkOp.status === 'CREATED') {
        // Still running, schedule another poll
        await ShopifyQueueService.addPollBulkJob(job.data, 30000) // Poll again in 30 seconds
        console.log(`[Worker] Bulk operation ${bulkOperationId} still running, will poll again`)
        return
      }
      
      if (bulkOp.status === 'FAILED' || bulkOp.status === 'CANCELED') {
        throw new Error(`Bulk operation failed with status: ${bulkOp.status}, error: ${bulkOp.errorCode}`)
      }
      
      if (bulkOp.status === 'COMPLETED') {
        console.log(`[Worker] Bulk operation ${bulkOperationId} completed, processing results`)
        
        if (!bulkOp.url) {
          throw new Error('No download URL provided for completed bulk operation')
        }
        
        // Process the results - data now goes directly to production tables
        const results = await ShopifyGraphQLService.processBulkResults(
          bulkOp.url,
          entity as 'orders' | 'customers' | 'products',
          brandId,
          connectionId
        )
        
        // Update ETL job
        if (etlJobId) {
          const totalRows = results.ordersProcessed + results.lineItemsProcessed + 
                          results.customersProcessed + results.productsProcessed
          
          await ShopifyQueueService.updateEtlJob(etlJobId, {
            status: 'completed',
            rows_written: totalRows,
            total_rows: totalRows,
            progress_pct: 100,
            completed_at: new Date().toISOString()
          })
        }
        
        console.log(`[Worker] Bulk operation ${bulkOperationId} processing completed:`, results)
        
        // 🚀 START NEXT BULK OPERATION (Sequential processing)
        await this.startNextBulkOperation(entity as 'orders' | 'customers' | 'products', brandId, connectionId, shop, accessToken)
        
        // 📦 TRIGGER INVENTORY SYNC AFTER PRODUCTS COMPLETE
        if (entity === 'products') {
          console.log(`[Worker] 📦 Products completed - triggering inventory sync...`)
          try {
            await this.triggerInventorySync(brandId, connectionId)
            console.log(`[Worker] ✅ Inventory sync triggered after products completion`)
          } catch (inventoryError) {
            console.error(`[Worker] ❌ Inventory sync failed:`, inventoryError)
            // Don't fail the whole sync for inventory issues
          }
        }
        
        // Check if ALL jobs are now complete and update connection status
        await this.checkAndUpdateOverallSyncStatus(brandId, connectionId)
      }
      
    } catch (error) {
      console.error(`[Worker] Bulk polling failed for ${bulkOperationId}:`, error)
      
      if (etlJobId) {
        await ShopifyQueueService.updateEtlJob(etlJobId, {
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          completed_at: new Date().toISOString()
        })
      }
      
      throw error
    }
  }

  /**
   * Trigger inventory sync after products complete
   */
  static async triggerInventorySync(brandId: string, connectionId: string): Promise<void> {
    try {
      console.log(`[Worker] 📦 Triggering inventory sync for brand ${brandId}`)
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/shopify/inventory/sync`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-internal-call': 'true'
        },
        body: JSON.stringify({ connectionId })
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Inventory sync API failed: ${response.status} - ${errorText}`)
      }
      
      const result = await response.json()
      console.log(`[Worker] 📦 Inventory sync response:`, result)
      
    } catch (error) {
      console.error(`[Worker] Failed to trigger inventory sync:`, error)
      throw error
    }
  }

  /**
   * Start the next bulk operation in sequence (orders -> customers -> products)
   */
  static async startNextBulkOperation(
    completedEntity: 'orders' | 'customers' | 'products',
    brandId: string,
    connectionId: string,
    shop: string,
    accessToken: string
  ): Promise<void> {
    try {
      let nextEntity: 'customers' | 'products' | null = null
      
      if (completedEntity === 'orders') {
        nextEntity = 'customers'
      } else if (completedEntity === 'customers') {
        nextEntity = 'products'
      }
      // If completed entity is 'products', no next entity (sequence complete)
      
      if (!nextEntity) {
        console.log(`[Worker] 🎉 ALL BULK OPERATIONS COMPLETED (${completedEntity} was last)`)
        return
      }
      
      console.log(`[Worker] 🚀 Starting NEXT bulk operation: ${nextEntity} (after ${completedEntity})`)
      
      await this.startBulkOperation(nextEntity, brandId, connectionId, shop, accessToken)
      
      console.log(`[Worker] ✅ Next bulk operation (${nextEntity}) started successfully`)
      
    } catch (error) {
      console.error(`[Worker] ❌ Failed to start next bulk operation:`, error)
      // Don't throw - let the sync continue with what we have
    }
  }

  /**
   * Check if all jobs are complete and update connection sync status
   */
  static async checkAndUpdateOverallSyncStatus(brandId: string, connectionId: string): Promise<void> {
    try {
      console.log(`[Worker] Checking overall sync status for brand ${brandId}`)
      
      // Get sync status from queue service (same logic as API)
      const status = await ShopifyQueueService.getSyncStatus(brandId)
      const milestones = status.shopify.milestones
      
      if (!milestones.length) {
        console.log(`[Worker] No milestones found for brand ${brandId}`)
        return
      }
      
      // Check if all milestones are completed (same logic as sync status API)
      const allCompleted = milestones.every((m: any) => m.status === 'completed')
      const anyFailed = milestones.some((m: any) => m.status === 'failed')
      
      if (allCompleted) {
        console.log(`[Worker] All jobs complete for brand ${brandId}, updating connection to completed`)
        
        const supabase = createClient()
        await supabase
          .from('platform_connections')
          .update({
            sync_status: 'completed',
            metadata: {
              queue_jobs_running: false,
              all_jobs_completed: true,
              sync_completed_at: new Date().toISOString()
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', connectionId)
          
        console.log(`[Worker] ✅ Updated connection ${connectionId} status to completed`)
        
      } else if (anyFailed) {
        console.log(`[Worker] Some jobs failed for brand ${brandId}, updating connection to failed`)
        
        const supabase = createClient()
        await supabase
          .from('platform_connections')
          .update({
            sync_status: 'failed',
            metadata: {
              queue_jobs_running: false,
              some_jobs_failed: true,
              sync_failed_at: new Date().toISOString()
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', connectionId)
          
      } else {
        console.log(`[Worker] Jobs still running for brand ${brandId}, keeping syncing status`)
      }
      
    } catch (error) {
      console.error(`[Worker] Error checking overall sync status:`, error)
    }
  }

  /**
   * Cleanup completed jobs periodically
   */
  static async cleanup(): Promise<void> {
    try {
      // Remove completed jobs older than 24 hours
      await shopifyQueue.clean(24 * 60 * 60 * 1000, 'completed')
      
      // Remove failed jobs older than 7 days
      await shopifyQueue.clean(7 * 24 * 60 * 60 * 1000, 'failed')
      
      console.log('[Worker] Cleanup completed')
    } catch (error) {
      console.error('[Worker] Cleanup failed:', error)
    }
  }

  /**
   * Get fresh access token from database to avoid 401 errors
   */
  static async getFreshAccessToken(connectionId: string): Promise<{ accessToken?: string; error?: string }> {
    try {
      const supabase = createClient()

      // First check if ANY connection exists with this ID (regardless of status)
      const { data: anyConnection, error: anyError } = await supabase
        .from('platform_connections')
        .select('id, status, platform_type, shop, brand_id, access_token')
        .eq('id', connectionId)
        .maybeSingle()

      if (anyError) {
        console.error('[Worker] Error checking connection existence:', anyError)
        return { error: anyError.message }
      }

      if (!anyConnection) {
        console.error(`[Worker] Connection ${connectionId} does not exist at all! This job should be cancelled.`)
        
        // Check what connections DO exist for debugging
        const { data: allConnections } = await supabase
          .from('platform_connections')
          .select('id, status, platform_type, shop, brand_id, created_at')
          .eq('platform_type', 'shopify')
          .order('created_at', { ascending: false })
          .limit(5)
        
        console.error('[Worker] Recent Shopify connections:', allConnections)
        
        // This is a hard error - the job should not be retried with a non-existent connection
        throw new Error('FATAL: Connection does not exist - cancelling job permanently')
      }

      // Log the connection status for debugging
      console.log(`[Worker] Found connection ${connectionId}:`, {
        status: anyConnection.status,
        platform_type: anyConnection.platform_type,
        shop: anyConnection.shop,
        brand_id: anyConnection.brand_id,
        has_token: !!anyConnection.access_token
      })

      if (anyConnection.status !== 'active') {
        console.error(`[Worker] Connection ${connectionId} status is '${anyConnection.status}', not 'active'`)
        return { error: `Connection status is ${anyConnection.status}, not active` }
      }

      if (!anyConnection.access_token) {
        console.error('[Worker] No access token found in connection:', connectionId)
        return { error: 'No access token found in connection' }
      }

      console.log(`[Worker] Retrieved access token for connection: ${connectionId}`)
      return { accessToken: anyConnection.access_token }
    } catch (error) {
      console.error('[Worker] Error getting fresh access token:', error)
      return { error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }
}

// Auto-initialize worker if running in worker mode
if (process.env.NODE_ENV === 'production' || process.env.WORKER_MODE === 'true') {
  ShopifyWorker.initialize()
  
  // Run cleanup every hour
  setInterval(ShopifyWorker.cleanup, 60 * 60 * 1000)
}
