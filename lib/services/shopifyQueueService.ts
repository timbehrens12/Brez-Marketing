import Queue from 'bull'
import { createClient } from '@/lib/supabase/server'

// Create Redis connection for Upstash
const redisConfig = {
  redis: {
    port: parseInt(process.env.REDIS_PORT || '6379'),
    host: process.env.REDIS_HOST?.replace('https://', '').replace('http://', '') || 'localhost',
    password: process.env.REDIS_PASSWORD,
    tls: process.env.REDIS_HOST?.includes('upstash') ? {} : undefined, // Only enable TLS for Upstash
    retryDelayOnFailover: 100,
    enableReadyCheck: false,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  },
}

// Define job queues
export const shopifyQueue = new Queue('shopify-sync', redisConfig)

// Job types
export enum ShopifyJobType {
  RECENT_SYNC = 'recent_sync',
  BULK_ORDERS = 'bulk_orders', 
  BULK_CUSTOMERS = 'bulk_customers',
  BULK_PRODUCTS = 'bulk_products',
  POLL_BULK = 'poll_bulk',
  INCREMENTAL = 'incremental',
  RECONCILE = 'reconcile'
}

// Job data interfaces
export interface ShopifyJobData {
  brandId: string
  connectionId: string
  shop: string
  accessToken: string
  jobType: ShopifyJobType
  bulkOperationId?: string
  entity?: string
  metadata?: Record<string, any>
}

export interface BulkJobData extends ShopifyJobData {
  bulkOperationId: string
  entity: 'orders' | 'customers' | 'products'
}

export class ShopifyQueueService {
  /**
   * Add a job to the queue
   */
  static async addJob(
    jobType: ShopifyJobType,
    data: ShopifyJobData,
    options: any = {}
  ): Promise<void> {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    console.log(`📋 [QUEUE-${jobId}] ===== ADDING JOB TO QUEUE =====`)
    console.log(`📋 [QUEUE-${jobId}] Job Type: ${jobType}`)
    console.log(`📋 [QUEUE-${jobId}] Brand ID: ${data.brandId}`)
    console.log(`📋 [QUEUE-${jobId}] Connection ID: ${data.connectionId}`)
    console.log(`📋 [QUEUE-${jobId}] Shop: ${data.shop}`)
    console.log(`📋 [QUEUE-${jobId}] Access Token: ${data.accessToken ? 'PRESENT' : 'MISSING'}`)
    console.log(`📋 [QUEUE-${jobId}] Options:`, JSON.stringify(options, null, 2))
    
    const defaultOptions = {
      attempts: 5, // Increased retry attempts
      backoff: {
        type: 'exponential',
        delay: 5000, // Start with 5 seconds
      },
      removeOnComplete: 20,
      removeOnFail: 20,
      timeout: 30 * 60 * 1000, // 30 minute timeout per job
      stallInterval: 60000, // Check for stalled jobs every minute
      maxStalledCount: 3, // Allow 3 stalled attempts before failing
    }

    const finalOptions = { ...defaultOptions, ...options }
    console.log(`📋 [QUEUE-${jobId}] Final options:`, JSON.stringify(finalOptions, null, 2))

    try {
      const job = await shopifyQueue.add(jobType, { ...data, queue_job_id: jobId }, finalOptions)
      console.log(`✅ [QUEUE-${jobId}] Job added successfully to queue`)
      console.log(`📋 [QUEUE-${jobId}] Queue job ID: ${job.id}`)
      console.log(`📋 [QUEUE-${jobId}] Priority: ${job.opts.priority || 'default'}`)
      console.log(`📋 [QUEUE-${jobId}] Delay: ${job.opts.delay || 0}ms`)
    } catch (error) {
      console.error(`❌ [QUEUE-${jobId}] Failed to add job to queue:`, error)
      console.error(`❌ [QUEUE-${jobId}] Error stack:`, error instanceof Error ? error.stack : 'No stack trace')
      throw error
    }
  }

  /**
   * Add recent sync job (immediate, small data pull)
   */
  static async addRecentSyncJob(
    brandId: string,
    connectionId: string,
    shop: string,
    accessToken: string
  ): Promise<void> {
    const recentSyncId = `recent_${Date.now()}`
    
    console.log(`🚀 [QUEUE-RECENT-${recentSyncId}] Adding recent sync job (HIGH PRIORITY)`)
    console.log(`📋 [QUEUE-RECENT-${recentSyncId}] Brand: ${brandId}`)
    console.log(`📋 [QUEUE-RECENT-${recentSyncId}] Shop: ${shop}`)
    
    await this.addJob(ShopifyJobType.RECENT_SYNC, {
      brandId,
      connectionId,
      shop,
      accessToken,
      jobType: ShopifyJobType.RECENT_SYNC,
      sync_job_id: recentSyncId
    }, { priority: 10 }) // High priority for immediate UI
    
    console.log(`✅ [QUEUE-RECENT-${recentSyncId}] Recent sync job queued successfully`)
  }

  /**
   * Add bulk operation jobs (historical data)
   */
  static async addBulkJobs(
    brandId: string,
    connectionId: string,
    shop: string,
    accessToken: string
  ): Promise<void> {
    const bulkJobsId = `bulk_${Date.now()}`
    
    console.log(`📦 [QUEUE-BULK-${bulkJobsId}] ===== ADDING BULK JOBS =====`)
    console.log(`📦 [QUEUE-BULK-${bulkJobsId}] Brand: ${brandId}`)
    console.log(`📦 [QUEUE-BULK-${bulkJobsId}] Shop: ${shop}`)
    console.log(`📦 [QUEUE-BULK-${bulkJobsId}] Adding 3 bulk jobs with sequential delays...`)
    
    // Add all bulk jobs with delays to prevent overwhelming Shopify
    console.log(`📦 [QUEUE-BULK-${bulkJobsId}] Adding ORDERS bulk job (delay: 1000ms)...`)
    await this.addJob(ShopifyJobType.BULK_ORDERS, {
      brandId,
      connectionId,
      shop,
      accessToken,
      jobType: ShopifyJobType.BULK_ORDERS,
      entity: 'orders',
      bulk_jobs_id: bulkJobsId
    }, { delay: 1000 })

    console.log(`📦 [QUEUE-BULK-${bulkJobsId}] Adding CUSTOMERS bulk job (delay: 2000ms)...`)
    await this.addJob(ShopifyJobType.BULK_CUSTOMERS, {
      brandId,
      connectionId,
      shop,
      accessToken,
      jobType: ShopifyJobType.BULK_CUSTOMERS,
      entity: 'customers',
      bulk_jobs_id: bulkJobsId
    }, { delay: 2000 })

    console.log(`📦 [QUEUE-BULK-${bulkJobsId}] Adding PRODUCTS bulk job (delay: 3000ms)...`)
    await this.addJob(ShopifyJobType.BULK_PRODUCTS, {
      brandId,
      connectionId,
      shop,
      accessToken,
      jobType: ShopifyJobType.BULK_PRODUCTS,
      entity: 'products',
      bulk_jobs_id: bulkJobsId
    }, { delay: 3000 })
    
    console.log(`✅ [QUEUE-BULK-${bulkJobsId}] All 3 bulk jobs added successfully`)
  }

  /**
   * Add polling job for bulk operation
   */
  static async addPollBulkJob(
    data: BulkJobData,
    delayMs: number = 30000 // Poll every 30 seconds
  ): Promise<void> {
    await this.addJob(ShopifyJobType.POLL_BULK, data, { 
      delay: delayMs,
      attempts: 20 // Keep trying for ~10 minutes
    })
  }

  /**
   * Create or update ETL job record in database
   */
  static async createEtlJob(
    brandId: string,
    entity: string,
    jobType: string,
    shopifyBulkId?: string
  ): Promise<number> {
    const etlId = `etl_${Date.now()}_${entity}`
    
    console.log(`💾 [ETL-${etlId}] ===== CREATING ETL JOB RECORD =====`)
    console.log(`💾 [ETL-${etlId}] Brand ID: ${brandId}`)
    console.log(`💾 [ETL-${etlId}] Entity: ${entity}`)
    console.log(`💾 [ETL-${etlId}] Job Type: ${jobType}`)
    console.log(`💾 [ETL-${etlId}] Shopify Bulk ID: ${shopifyBulkId || 'NONE'}`)
    
    const supabase = createClient()
    
    const etlData = {
      brand_id: brandId,
      entity: entity,
      job_type: jobType,
      status: 'queued',
      shopify_bulk_id: shopifyBulkId,
      started_at: new Date().toISOString()
    }
    
    console.log(`💾 [ETL-${etlId}] Inserting ETL job data:`, JSON.stringify(etlData, null, 2))
    
    const { data, error } = await supabase
      .from('etl_job')
      .insert(etlData)
      .select('id')
      .single()

    if (error) {
      console.error(`❌ [ETL-${etlId}] Error creating ETL job:`, error)
      console.error(`❌ [ETL-${etlId}] Error details:`, JSON.stringify(error, null, 2))
      throw error
    }

    console.log(`✅ [ETL-${etlId}] ETL job created successfully with ID: ${data.id}`)
    return data.id
  }

  /**
   * Update ETL job status and progress
   */
  static async updateEtlJob(
    jobId: number,
    updates: {
      status?: string
      rows_written?: number
      total_rows?: number
      progress_pct?: number
      error_message?: string
      completed_at?: string
      shopify_bulk_id?: string
    }
  ): Promise<void> {
    const updateId = `update_${Date.now()}_${jobId}`
    
    console.log(`💾 [ETL-UPDATE-${updateId}] ===== UPDATING ETL JOB =====`)
    console.log(`💾 [ETL-UPDATE-${updateId}] Job ID: ${jobId}`)
    console.log(`💾 [ETL-UPDATE-${updateId}] Updates:`, JSON.stringify(updates, null, 2))
    
    const supabase = createClient()
    
    const finalUpdates = {
      ...updates,
      updated_at: new Date().toISOString()
    }
    
    console.log(`💾 [ETL-UPDATE-${updateId}] Final update data:`, JSON.stringify(finalUpdates, null, 2))
    
    const { error } = await supabase
      .from('etl_job')
      .update(finalUpdates)
      .eq('id', jobId)

    if (error) {
      console.error(`❌ [ETL-UPDATE-${updateId}] Error updating ETL job:`, error)
      console.error(`❌ [ETL-UPDATE-${updateId}] Error details:`, JSON.stringify(error, null, 2))
      throw error
    }
    
    console.log(`✅ [ETL-UPDATE-${updateId}] ETL job updated successfully`)
  }

  /**
   * Queue historical sync for a brand
   */
  static async queueHistoricalSync(brandId: string) {
    // Queue ACTUAL jobs for historical sync
    try {
      // Create ETL job records for tracking
      const recentJob = await this.createEtlJob(brandId, 'recent_sync', 'recent_sync')
      const ordersJob = await this.createEtlJob(brandId, 'orders', 'bulk_orders')
      const customersJob = await this.createEtlJob(brandId, 'customers', 'bulk_customers')
      const productsJob = await this.createEtlJob(brandId, 'products', 'bulk_products')
      
      // Queue the actual jobs
      await this.addJob('recent_sync', { brandId, etlJobId: recentJob })
      await this.addJob('bulk_orders', { brandId, etlJobId: ordersJob })
      await this.addJob('bulk_customers', { brandId, etlJobId: customersJob })
      await this.addJob('bulk_products', { brandId, etlJobId: productsJob })
      
      return {
        jobs: [
          { id: recentJob, type: 'recent_sync', status: 'queued' },
          { id: ordersJob, type: 'bulk_orders', status: 'queued' },
          { id: customersJob, type: 'bulk_customers', status: 'queued' },
          { id: productsJob, type: 'bulk_products', status: 'queued' }
        ],
        estimated_completion: '5-10 minutes'
      }
    } catch (error) {
      throw new Error(`Failed to queue historical sync: ${error}`)
    }
  }

  /**
   * Get sync status for a brand
   */
  static async getSyncStatus(brandId: string): Promise<any> {
    const supabase = createClient()
    
    // Get ETL jobs directly from public schema
    const { data: jobs, error } = await supabase
      .from('etl_job')
      .select('*')
      .eq('brand_id', brandId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[Queue] Error fetching sync status:', error)
      throw error
    }

    // Group by entity and get latest status
    const statusByEntity: Record<string, any> = {}
    
    for (const job of jobs || []) {
      if (!statusByEntity[job.entity]) {
        statusByEntity[job.entity] = {
          entity: job.entity,
          status: job.status,
          progress_pct: job.progress_pct || 0,
          rows_written: job.rows_written || 0,
          total_rows: job.total_rows,
          error_message: job.error_message,
          started_at: job.started_at,
          completed_at: job.completed_at,
          updated_at: job.updated_at
        }
      }
    }

    return {
      shopify: {
        milestones: Object.values(statusByEntity),
        last_update: new Date().toISOString()
      }
    }
  }

  /**
   * Update cursor for incremental syncs
   */
  static async updateCursor(
    brandId: string,
    entity: string,
    lastCompleteAt: string
  ): Promise<void> {
    const supabase = createClient()
    
    const { error } = await supabase
      .from('control.etl_cursor')
      .upsert({
        brand_id: brandId,
        entity: entity,
        last_complete_at: lastCompleteAt,
        last_sync_at: new Date().toISOString()
      })

    if (error) {
      console.error('[Queue] Error updating cursor:', error)
      throw error
    }
  }

  /**
   * Get last cursor for incremental sync
   */
  static async getCursor(brandId: string, entity: string): Promise<string | null> {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('control.etl_cursor')
      .select('last_complete_at')
      .eq('brand_id', brandId)
      .eq('entity', entity)
      .single()

    if (error && error.code !== 'PGRST116') { // Not found is ok
      console.error('[Queue] Error fetching cursor:', error)
      throw error
    }

    return data?.last_complete_at || null
  }
}
