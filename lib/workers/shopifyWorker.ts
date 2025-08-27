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
   * Process recent sync job (immediate, small data pull)
   */
  static async processRecentSync(job: Job<ShopifyJobData>): Promise<void> {
    const { brandId, connectionId, shop, accessToken } = job.data
    
    console.log(`[Worker] Processing recent sync for brand ${brandId}`)
    
    // Create ETL job record
    const etlJobId = await ShopifyQueueService.createEtlJob(
      brandId,
      'recent_sync',
      ShopifyJobType.RECENT_SYNC
    )
    
    try {
      // Update job status to running
      await ShopifyQueueService.updateEtlJob(etlJobId, {
        status: 'running'
      })
      
      // Use existing immediate recent sync (last 3 days)
      await ShopifyBulkService.immediateRecentSync(
        brandId,
        shop,
        accessToken,
        connectionId
      )
      
      // Mark job as completed
      await ShopifyQueueService.updateEtlJob(etlJobId, {
        status: 'completed',
        completed_at: new Date().toISOString(),
        rows_written: 1 // We don't track exact count for recent sync
      })
      
      console.log(`[Worker] Recent sync completed for brand ${brandId}`)
      
    } catch (error) {
      console.error(`[Worker] Recent sync failed for brand ${brandId}:`, error)
      
      await ShopifyQueueService.updateEtlJob(etlJobId, {
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        completed_at: new Date().toISOString()
      })
      
      throw error
    }
  }

  /**
   * Process bulk orders export
   */
  static async processBulkOrders(job: Job<ShopifyJobData>): Promise<void> {
    const { brandId, connectionId, shop, accessToken } = job.data
    
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
    const { brandId, connectionId, shop, accessToken } = job.data
    
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
    const { brandId, connectionId, shop, accessToken } = job.data
    
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
    const { brandId, connectionId, shop, accessToken, bulkOperationId, entity, metadata } = job.data
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
        
        // Process the results
        const results = await ShopifyGraphQLService.processBulkResults(
          bulkOp.url,
          entity as 'orders' | 'customers' | 'products',
          brandId,
          connectionId
        )
        
        // Promote staging data to production
        await ShopifyGraphQLService.promoteToProduction(
          entity as 'orders' | 'customers' | 'products',
          brandId
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
}

// Auto-initialize worker if running in worker mode
if (process.env.NODE_ENV === 'production' || process.env.WORKER_MODE === 'true') {
  ShopifyWorker.initialize()
  
  // Run cleanup every hour
  setInterval(ShopifyWorker.cleanup, 60 * 60 * 1000)
}
