import Queue from 'bull'
import { createClient } from '@/lib/supabase/server'

// Create Redis connection for Meta queue (same as Shopify)
const getRedisConfig = () => {
  // Check for Upstash REST API format first (Vercel integration)
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    // Upstash uses REST API, but Bull needs TCP connection
    // Extract host from REST URL for Bull
    const restUrl = process.env.UPSTASH_REDIS_REST_URL
    const host = restUrl.replace('https://', '').replace('http://', '').split('/')[0]
    
    const config = {
      redis: {
        port: 6379,
        host: host,
        password: process.env.UPSTASH_REDIS_REST_TOKEN,
        tls: {},
        retryDelayOnFailover: 100,
        enableReadyCheck: false,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      },
    }

    console.log('[Meta Queue] Using Upstash Redis:', {
      host: host,
      port: 6379,
      hasToken: !!process.env.UPSTASH_REDIS_REST_TOKEN
    })

    return config
  }
  
  // Fall back to standard Redis config
  const config = {
    redis: {
      port: parseInt(process.env.REDIS_PORT || '6379'),
      host: process.env.REDIS_HOST?.replace('https://', '').replace('http://', '') || 'localhost',
      password: process.env.REDIS_PASSWORD,
      tls: process.env.REDIS_HOST?.includes('upstash') ? {} : undefined,
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    },
  }

  console.log('[Meta Queue] Redis config:', {
    host: config.redis.host,
    port: config.redis.port,
    hasPassword: !!config.redis.password,
    isUpstash: config.redis.tls !== undefined
  })

  return config
}

const redisConfig = getRedisConfig()

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
  timeRange?: {
    since: string
    until: string
  }
  priority?: 'high' | 'normal' | 'low'
  description?: string
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
      // 🎯 Auto-remove failed jobs that are clearly orphaned to prevent queue pollution
      removeOnComplete: 50, // Keep more successful jobs for debugging
      removeOnFail: 5, // Remove failed jobs quickly to prevent accumulation
    }

    try {
      console.log(`[Meta Queue] Attempting to add ${jobType} job for brand ${data.brandId}`)

      // Check if Redis is available
      if (!process.env.REDIS_HOST && !process.env.REDIS_URL) {
        console.warn(`[Meta Queue] ⚠️ Redis not configured, cannot queue ${jobType} job`)
        console.warn(`[Meta Queue] Missing: REDIS_HOST=${!!process.env.REDIS_HOST}, REDIS_URL=${!!process.env.REDIS_URL}`)
        throw new Error('Redis not configured - cannot queue background jobs')
      }

      // TEMPORARILY SKIP ETL job creation due to database schema issues
      let etlJobId: number | undefined
      console.log(`[Meta Queue] Skipping ETL job creation for ${jobType} due to schema issues`)

      // Add ETL job ID to job data for tracking
      const jobDataWithEtl = {
        ...data,
        etlJobId
      }

      console.log(`[Meta Queue] 🔄 About to add ${jobType} job to queue...`)
      const job = await metaQueue.add(jobType, jobDataWithEtl, { ...defaultOptions, ...options })
      console.log(`[Meta Queue] ✅ Added ${jobType} job for brand ${data.brandId} with job ID: ${job.id}`)
    } catch (error) {
      console.error(`[Meta Queue] ❌ Failed to add ${jobType} job:`, error)
      console.error(`[Meta Queue] ❌ Error details:`, {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })
      // Don't throw - let the sync continue without background jobs
      console.warn(`[Meta Queue] ⚠️ Continuing without background sync for ${jobType}`)
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

    // Queue all historical job types with NO delays (60s timeout allows batch processing)
    // Priority system will handle order: campaigns (8) > demographics (6) > insights (4)
    
    // 1. Historical Campaigns (priority - need this first)
    console.log(`[Meta Queue] 📋 Queueing ${chunks.length} HISTORICAL_CAMPAIGNS jobs...`)
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
        delay: 0, // No delay - process immediately
        priority: 8 // High priority for campaigns
      })
      console.log(`[Meta Queue] ✅ Queued HISTORICAL_CAMPAIGNS job ${i + 1}/${chunks.length}: ${chunk.start} to ${chunk.end}`)
    }
    console.log(`[Meta Queue] ✅ All ${chunks.length} HISTORICAL_CAMPAIGNS jobs queued`)

    // 2. Historical Demographics (after campaigns via priority)
    console.log(`[Meta Queue] 📋 Queueing ${chunks.length} HISTORICAL_DEMOGRAPHICS jobs...`)
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
        delay: 0, // No delay - process immediately
        priority: 6 // Medium priority for demographics
      })
      console.log(`[Meta Queue] ✅ Queued HISTORICAL_DEMOGRAPHICS job ${i + 1}/${chunks.length}: ${chunk.start} to ${chunk.end}`)
    }
    console.log(`[Meta Queue] ✅ All ${chunks.length} HISTORICAL_DEMOGRAPHICS jobs queued`)

    // 3. Historical Daily Insights (lowest priority, most comprehensive)
    console.log(`[Meta Queue] 📋 Queueing ${chunks.length} HISTORICAL_INSIGHTS jobs...`)
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
        delay: 0, // No delay - process immediately
        priority: 4 // Lower priority for insights
      })
      console.log(`[Meta Queue] ✅ Queued HISTORICAL_INSIGHTS job ${i + 1}/${chunks.length}: ${chunk.start} to ${chunk.end}`)
    }
    console.log(`[Meta Queue] ✅ All ${chunks.length} HISTORICAL_INSIGHTS jobs queued`)

    console.log(`[Meta Queue] 🎉 TOTAL: Queued ${chunks.length * 3} historical jobs (${chunks.length} campaigns + ${chunks.length} demographics + ${chunks.length} insights) - no delays, priority-based processing`)
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

      // Check if Redis is available before attempting to queue
      const hasRedis = process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_HOST || process.env.REDIS_URL
      if (!hasRedis) {
        console.warn(`[Meta Queue] ⚠️ Redis not configured - skipping background historical sync`)
        return {
          success: false,
          estimatedCompletion: 'N/A - Redis not configured',
          totalJobs: 0
        }
      }
      
      console.log(`[Meta Queue] ✅ Redis is configured, proceeding with queue jobs`)

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
      // Return success=false instead of throwing so sync can continue without background jobs
      return {
        success: false,
        estimatedCompletion: 'Failed to queue - check Redis configuration',
        totalJobs: 0
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

  /**
   * Clean up queue jobs for a deleted brand to prevent orphaned jobs
   */
  static async cleanupJobsByBrand(brandId: string): Promise<void> {
    console.log(`[Meta Queue] Cleaning up jobs for brand ${brandId}`)
    
    try {
      // Get all waiting and failed jobs
      const waitingJobs = await metaQueue.getWaiting()
      const failedJobs = await metaQueue.getFailed()
      const allJobs = [...waitingJobs, ...failedJobs]
      
      let removedCount = 0
      
      for (const job of allJobs) {
        if (job.data && job.data.brandId === brandId) {
          await job.remove()
          removedCount++
          console.log(`[Meta Queue] Removed job ${job.id} for deleted brand ${brandId}`)
        }
      }
      
      console.log(`[Meta Queue] ✅ Removed ${removedCount} jobs for brand ${brandId}`)
    } catch (error) {
      console.error(`[Meta Queue] ❌ Error cleaning up jobs for brand ${brandId}:`, error)
      throw error
    }
  }
}
