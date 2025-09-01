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

    try {
      await shopifyQueue.add(jobType, data, { ...defaultOptions, ...options })
      console.log(`[Queue] Added ${jobType} job for brand ${data.brandId}`)
    } catch (error) {
      console.error(`[Queue] Failed to add ${jobType} job:`, error)
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
    await this.addJob(ShopifyJobType.RECENT_SYNC, {
      brandId,
      connectionId,
      shop,
      accessToken,
      jobType: ShopifyJobType.RECENT_SYNC
    }, { priority: 10 }) // High priority for immediate UI
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
    // Add all bulk jobs with delays to prevent overwhelming Shopify
    await this.addJob(ShopifyJobType.BULK_ORDERS, {
      brandId,
      connectionId,
      shop,
      accessToken,
      jobType: ShopifyJobType.BULK_ORDERS,
      entity: 'orders'
    }, { delay: 1000 })

    await this.addJob(ShopifyJobType.BULK_CUSTOMERS, {
      brandId,
      connectionId,
      shop,
      accessToken,
      jobType: ShopifyJobType.BULK_CUSTOMERS,
      entity: 'customers'
    }, { delay: 2000 })

    await this.addJob(ShopifyJobType.BULK_PRODUCTS, {
      brandId,
      connectionId,
      shop,
      accessToken,
      jobType: ShopifyJobType.BULK_PRODUCTS,
      entity: 'products'
    }, { delay: 3000 })
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
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('etl_job')
      .insert({
        brand_id: brandId,
        entity: entity,
        job_type: jobType,
        status: 'queued',
        shopify_bulk_id: shopifyBulkId,
        started_at: new Date().toISOString()
      })
      .select('id')
      .single()

    if (error) {
      console.error('[Queue] Error creating ETL job:', error)
      throw error
    }

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
    }
  ): Promise<void> {
    const supabase = createClient()
    
    const { error } =     await supabase
      .from('etl_job')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)

    if (error) {
      console.error('[Queue] Error updating ETL job:', error)
      throw error
    }
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
