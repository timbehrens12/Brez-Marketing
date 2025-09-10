import Queue from 'bull'
import { createClient } from '@/lib/supabase/server'

// Create Redis connection for Meta queue (same as Shopify)
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

// Define Meta job queue
export const metaQueue = new Queue('meta-sync', redisConfig)

// Meta job types
export enum MetaJobType {
  RECENT_SYNC = 'recent_sync',                    // Last 7 days for immediate UI
  HISTORICAL_CAMPAIGNS = 'historical_campaigns',  // All-time campaign data by chunks
  HISTORICAL_DEMOGRAPHICS = 'historical_demographics', // All-time demographic data by chunks
  HISTORICAL_INSIGHTS = 'historical_insights',    // All-time daily insights by chunks
  DAILY_SYNC = 'daily_sync',                     // Ongoing daily sync
  RECONCILE = 'reconcile'                        // Data validation/cleanup
}

// Job data interfaces
export interface MetaJobData {
  brandId: string
  connectionId: string
  accessToken: string
  accountId: string
  jobType: MetaJobType
  startDate?: string
  endDate?: string
  entity?: string
  metadata?: Record<string, any>
  etlJobId?: number
}

export interface MetaHistoricalJobData extends MetaJobData {
  startDate: string
  endDate: string
  entity: 'campaigns' | 'demographics' | 'insights'
  chunkNumber: number
  totalChunks: number
}

export class MetaQueueService {
  /**
   * Add a job to the Meta queue
   */
  static async addJob(
    jobType: MetaJobType,
    data: MetaJobData,
    options: any = {}
  ): Promise<void> {
    const defaultOptions = {
      attempts: 5, // Retry attempts for Meta API rate limits
      backoff: {
        type: 'exponential',
        delay: 10000, // Start with 10 seconds for Meta API
      },
      removeOnComplete: 20,
      removeOnFail: 20,
      timeout: 45 * 60 * 1000, // 45 minute timeout per job (Meta API can be slow)
      stallInterval: 60000, // Check for stalled jobs every minute
      maxStalledCount: 3,
    }

    try {
      await metaQueue.add(jobType, data, { ...defaultOptions, ...options })
      console.log(`[Meta Queue] Added ${jobType} job for brand ${data.brandId}`)
    } catch (error) {
      console.error(`[Meta Queue] Failed to add ${jobType} job:`, error)
      throw error
    }
  }

  /**
   * Add recent sync job (last 7 days for immediate UI)
   */
  static async addRecentSyncJob(
    brandId: string,
    connectionId: string,
    accessToken: string,
    accountId: string
  ): Promise<void> {
    await this.addJob(MetaJobType.RECENT_SYNC, {
      brandId,
      connectionId,
      accessToken,
      accountId,
      jobType: MetaJobType.RECENT_SYNC
    }, { priority: 10 }) // High priority for immediate UI
  }

  /**
   * Add comprehensive historical backfill jobs
   * This breaks down the full historical sync into manageable chunks
   */
  static async addHistoricalBackfillJobs(
    brandId: string,
    connectionId: string,
    accessToken: string,
    accountId: string,
    accountCreatedDate?: string
  ): Promise<void> {
    // Calculate date ranges for historical backfill  
    const endDate = new Date()
    
    // FIXED: Use 12 months maximum to stay within Meta's reach limitation (13 months)
    let startDate: Date
    if (accountCreatedDate) {
      const accountDate = new Date(accountCreatedDate)
      const twelveMonthsAgo = new Date()
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)
      
      // Use the more recent date: account creation or 12 months ago
      startDate = accountDate > twelveMonthsAgo ? accountDate : twelveMonthsAgo
      console.log(`[Meta Queue] Using account creation date ${accountDate.toISOString().split('T')[0]} vs 12-month limit ${twelveMonthsAgo.toISOString().split('T')[0]}, chose: ${startDate.toISOString().split('T')[0]}`)
    } else {
      // Default to 12 months ago to stay within Meta's reach limitation
      startDate = new Date()
      startDate.setMonth(startDate.getMonth() - 12)
      console.log(`[Meta Queue] ⚠️ No account creation date provided, defaulting to 12 months ago: ${startDate.toISOString().split('T')[0]}`)
    }
    
    console.log(`[Meta Queue] Planning historical backfill from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`)
    
    // Create 3-month chunks to avoid timeouts and rate limits
    const chunks = this.createDateChunks(startDate, endDate, 90) // 90-day chunks
    
    console.log(`[Meta Queue] Created ${chunks.length} chunks for historical backfill`)

    // Queue all historical job types with progressive delays
    let delayMs = 0
    
    // 1. Historical Campaigns (priority - need this first)
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      await this.addJob(MetaJobType.HISTORICAL_CAMPAIGNS, {
        brandId,
        connectionId,
        accessToken,
        accountId,
        jobType: MetaJobType.HISTORICAL_CAMPAIGNS,
        startDate: chunk.start,
        endDate: chunk.end,
        entity: 'campaigns',
        metadata: {
          chunkNumber: i + 1,
          totalChunks: chunks.length,
          chunkType: 'campaigns'
        }
      } as MetaHistoricalJobData, { 
        delay: delayMs,
        priority: 8 // High priority for campaigns
      })
      delayMs += 5000 // 5 second delay between campaign chunks
    }

    // 2. Historical Demographics (after campaigns)
    delayMs += 30000 // 30 second gap before starting demographics
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      await this.addJob(MetaJobType.HISTORICAL_DEMOGRAPHICS, {
        brandId,
        connectionId,
        accessToken,
        accountId,
        jobType: MetaJobType.HISTORICAL_DEMOGRAPHICS,
        startDate: chunk.start,
        endDate: chunk.end,
        entity: 'demographics',
        metadata: {
          chunkNumber: i + 1,
          totalChunks: chunks.length,
          chunkType: 'demographics'
        }
      } as MetaHistoricalJobData, { 
        delay: delayMs,
        priority: 6 // Medium priority for demographics
      })
      delayMs += 8000 // 8 second delay between demographic chunks
    }

    // 3. Historical Daily Insights (lowest priority, most comprehensive)
    delayMs += 60000 // 1 minute gap before starting insights
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      await this.addJob(MetaJobType.HISTORICAL_INSIGHTS, {
        brandId,
        connectionId,
        accessToken,
        accountId,
        jobType: MetaJobType.HISTORICAL_INSIGHTS,
        startDate: chunk.start,
        endDate: chunk.end,
        entity: 'insights',
        metadata: {
          chunkNumber: i + 1,
          totalChunks: chunks.length,
          chunkType: 'insights'
        }
      } as MetaHistoricalJobData, { 
        delay: delayMs,
        priority: 4 // Lower priority for insights
      })
      delayMs += 10000 // 10 second delay between insight chunks
    }

    console.log(`[Meta Queue] Queued ${chunks.length * 3} historical jobs with total estimated time: ${Math.ceil(delayMs / 60000)} minutes`)
  }

  /**
   * Create date chunks for processing
   */
  static createDateChunks(startDate: Date, endDate: Date, daysPerChunk: number): Array<{start: string, end: string}> {
    const chunks: Array<{start: string, end: string}> = []
    const currentDate = new Date(startDate)
    
    while (currentDate < endDate) {
      const chunkStart = new Date(currentDate)
      const chunkEnd = new Date(currentDate)
      chunkEnd.setDate(chunkEnd.getDate() + daysPerChunk - 1)
      
      // Don't go past the end date
      if (chunkEnd > endDate) {
        chunkEnd.setTime(endDate.getTime())
      }
      
      chunks.push({
        start: chunkStart.toISOString().split('T')[0],
        end: chunkEnd.toISOString().split('T')[0]
      })
      
      // Move to next chunk
      currentDate.setDate(currentDate.getDate() + daysPerChunk)
    }
    
    return chunks
  }

  /**
   * Create or update ETL job record in database for tracking
   */
  static async createEtlJob(
    brandId: string,
    entity: string,
    jobType: string,
    dateRange?: { start: string, end: string }
  ): Promise<number> {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('etl_job')
      .insert({
        brand_id: brandId,
        entity: entity,
        job_type: jobType,
        status: 'queued',
        started_at: new Date().toISOString()
        // Note: Removed metadata field as it doesn't exist in the database schema
      })
      .select('id')
      .single()

    if (error) {
      console.error('[Meta Queue] Error creating ETL job:', error)
      console.error('[Meta Queue] Failed job details:', { brandId, entity, jobType, dateRange })
      throw error
    }

    console.log(`[Meta Queue] Created ETL job ${data.id} for ${entity} (${jobType}) ${dateRange ? `${dateRange.start} to ${dateRange.end}` : ''}`)
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
    
    const { error } = await supabase
      .from('etl_job')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)

    if (error) {
      console.error('[Meta Queue] Error updating ETL job:', error)
      throw error
    }
  }

  /**
   * Get sync status for a brand
   */
  static async getSyncStatus(brandId: string): Promise<any> {
    const supabase = createClient()
    
    // Get Meta ETL jobs (use job_type LIKE for Meta jobs)
    const { data: jobs, error } = await supabase
      .from('etl_job')
      .select('*')
      .eq('brand_id', brandId)
      .in('job_type', ['recent_sync', 'historical_campaigns', 'historical_demographics', 'historical_insights'])
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[Meta Queue] Error fetching sync status:', error)
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
      meta: {
        milestones: Object.values(statusByEntity),
        last_update: new Date().toISOString()
      }
    }
  }

  /**
   * Queue complete historical sync for when Meta is first connected
   */
  static async queueCompleteHistoricalSync(
    brandId: string,
    connectionId: string,
    accessToken: string,
    accountId: string,
    accountCreatedDate?: string
  ): Promise<{ success: boolean, estimatedCompletion: string, totalJobs: number }> {
    try {
      console.log(`[Meta Queue] Starting complete historical sync for brand ${brandId}`)
      
      // Step 1: Add recent sync for immediate UI (high priority)
      await this.addRecentSyncJob(brandId, connectionId, accessToken, accountId)
      
      // Step 2: RE-ENABLE HISTORICAL BACKFILL - Queue all historical backfill jobs
      await this.addHistoricalBackfillJobs(brandId, connectionId, accessToken, accountId, accountCreatedDate)
      console.log(`[Meta Queue] Historical backfill re-enabled - full data sync will proceed`)
      
      // Calculate estimated completion time with historical backfill
      const chunks = this.createDateChunks(
        new Date(accountCreatedDate || '2020-01-01'), 
        new Date(), 
        90
      )
      const totalJobs = 1 + (chunks.length * 3) // Recent sync + (chunks * 3 job types)
      const estimatedMinutes = Math.max(5, Math.ceil(totalJobs * 0.5)) // Estimate 30 seconds per job, min 5 minutes
      
      console.log(`[Meta Queue] Queued ${totalJobs} total jobs, estimated completion: ${estimatedMinutes} minutes`)
      
      return {
        success: true,
        estimatedCompletion: `${estimatedMinutes} minutes`,
        totalJobs
      }
    } catch (error) {
      console.error('[Meta Queue] Error queuing complete historical sync:', error)
      throw error
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
        entity: `meta_${entity}`,
        last_complete_at: lastCompleteAt,
        last_sync_at: new Date().toISOString()
      })

    if (error) {
      console.error('[Meta Queue] Error updating cursor:', error)
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
      .eq('entity', `meta_${entity}`)
      .single()

    if (error && error.code !== 'PGRST116') { // Not found is ok
      console.error('[Meta Queue] Error fetching cursor:', error)
      throw error
    }

    return data?.last_complete_at || null
  }
}
