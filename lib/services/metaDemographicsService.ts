/**
 * Meta Demographics Service - Comprehensive 12-month sync system
 * 
 * Implements ChatGPT's refined strategy:
 * - Tiered granularity (0-35 days: daily, 36-180: weekly, 181-365: monthly)
 * - Idempotent operations with unique constraints
 * - Progressive aggregation with automatic rollover
 * - Rate limiting and error recovery
 * - Redis caching for performance
 */

import { getSupabaseClient } from '@/lib/supabase/client'
import Redis from 'ioredis'

// Types for the service
interface DemographicsJob {
  jobKey: string
  brandId: string
  connectionId: string
  accountId: string
  level: 'campaign' | 'adset' | 'ad'
  breakdownTypes: string[]
  dateFrom: string
  dateTo: string
  granularity: 'daily' | 'weekly' | 'monthly'
  priority: number
}

interface SyncConfig {
  maxConcurrentJobs: number
  maxApiCallsPerMinute: number
  maxRowsPerDay: number
  retryDelayMs: number
  maxRetries: number
}

interface BreakdownConfig {
  type: string
  maxValues: number
  collapseThreshold: number // Collapse values below this impression count to "Other"
}

class MetaDemographicsService {
  private redis: Redis | null = null
  private supabase = getSupabaseClient()
  
  // Configuration following ChatGPT's recommendations
  private readonly config: SyncConfig = {
    maxConcurrentJobs: 3, // Prevent overwhelming Meta API
    maxApiCallsPerMinute: 200, // Conservative rate limit
    maxRowsPerDay: 800, // Row budget per day
    retryDelayMs: 5000, // 5 second retry delay
    maxRetries: 3
  }

  // Breakdown configurations with limits to prevent explosion
  private readonly breakdownConfigs: BreakdownConfig[] = [
    { type: 'age_gender', maxValues: 20, collapseThreshold: 100 }, // 18-24|male, etc.
    { type: 'region', maxValues: 50, collapseThreshold: 50 }, // US-CA, US-TX, etc. (state level only)
    { type: 'device_platform', maxValues: 10, collapseThreshold: 20 }, // mobile, desktop, etc.
    { type: 'placement', maxValues: 15, collapseThreshold: 30 } // facebook_feed, instagram_story, etc.
  ]

  constructor() {
    this.initializeRedis()
  }

  private async initializeRedis() {
    try {
      if (process.env.REDIS_URL) {
        // Initialize Redis connection for caching and rate limiting
        this.redis = new Redis(process.env.REDIS_URL)
        this.redis.on('error', (error) => {
          console.warn('Redis connection error, continuing without cache:', error)
          this.redis = null
        })
        await this.redis.ping()
        console.log('✅ Redis connected successfully')
      } else {
        console.log('No REDIS_URL provided, continuing without cache')
      }
    } catch (error) {
      console.error('Redis initialization failed:', error)
      this.redis = null
      // Continue without Redis - degraded performance but functional
    }
  }

  /**
   * Main entry point: Start comprehensive 12-month sync for a brand
   */
  async startComprehensiveSync(brandId: string): Promise<{ success: boolean; message: string; jobsCreated: number }> {
    try {
      // Get Meta connection for this brand
      const { data: connection } = await this.supabase
        .from('platform_connections')
        .select('*')
        .eq('brand_id', brandId)
        .eq('platform_type', 'meta')
        .eq('status', 'active')
        .single()

      if (!connection) {
        return { success: false, message: 'No active Meta connection found', jobsCreated: 0 }
      }

      // Get account ID from metadata (could be either format)
      const rawAccountId = connection.metadata?.account_id || connection.metadata?.ad_account_id

      if (!rawAccountId) {
        return { success: false, message: 'No Meta account ID found in connection metadata', jobsCreated: 0 }
      }

      // Normalize account ID (remove act_ prefix if present)
      const accountId = rawAccountId.replace('act_', '')

      // Initialize or update sync status
      await this.initializeSyncStatus(brandId, connection.id, accountId)

      // Create jobs following tiered strategy
      const jobs = await this.createTieredSyncJobs(brandId, connection.id, accountId)
      
      // Queue jobs for processing
      const jobsCreated = await this.queueJobs(jobs)

      return { 
        success: true, 
        message: `Created ${jobsCreated} sync jobs for 12-month demographics data`, 
        jobsCreated 
      }
    } catch (error) {
      console.error('Error starting comprehensive sync:', error)
      return { success: false, message: `Sync initialization failed: ${error.message}`, jobsCreated: 0 }
    }
  }

  /**
   * Create tiered sync jobs following ChatGPT's granularity policy
   */
  private async createTieredSyncJobs(brandId: string, connectionId: string, accountId: string): Promise<DemographicsJob[]> {
    const jobs: DemographicsJob[] = []
    const today = new Date()
    
    // Phase 1: Recent data (0-35 days) - Daily granularity
    for (let i = 0; i <= 35; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      // Create jobs for each breakdown type separately to avoid cross-products
      for (const breakdown of this.breakdownConfigs) {
        const jobKey = this.generateJobKey(accountId, 'campaign', [breakdown.type], dateStr, dateStr, 'daily')
        
        jobs.push({
          jobKey,
          brandId,
          connectionId,
          accountId,
          level: 'campaign',
          breakdownTypes: [breakdown.type],
          dateFrom: dateStr,
          dateTo: dateStr,
          granularity: 'daily',
          priority: i <= 7 ? 1 : 2 // Higher priority for last 7 days
        })
      }
    }

    // Phase 2: Medium-term data (36-180 days) - Weekly granularity
    for (let week = 6; week <= 26; week++) { // Start from week 6 (after daily data)
      const weekStart = new Date(today)
      weekStart.setDate(weekStart.getDate() - (week * 7))
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)
      
      const startStr = weekStart.toISOString().split('T')[0]
      const endStr = weekEnd.toISOString().split('T')[0]
      
      for (const breakdown of this.breakdownConfigs) {
        const jobKey = this.generateJobKey(accountId, 'campaign', [breakdown.type], startStr, endStr, 'weekly')
        
        jobs.push({
          jobKey,
          brandId,
          connectionId,
          accountId,
          level: 'campaign',
          breakdownTypes: [breakdown.type],
          dateFrom: startStr,
          dateTo: endStr,
          granularity: 'weekly',
          priority: 3
        })
      }
    }

    // Phase 3: Historical data (181-365 days) - Monthly granularity
    for (let month = 6; month <= 12; month++) {
      const monthStart = new Date(today.getFullYear(), today.getMonth() - month, 1)
      const monthEnd = new Date(today.getFullYear(), today.getMonth() - month + 1, 0)
      
      const startStr = monthStart.toISOString().split('T')[0]
      const endStr = monthEnd.toISOString().split('T')[0]
      
      for (const breakdown of this.breakdownConfigs) {
        const jobKey = this.generateJobKey(accountId, 'campaign', [breakdown.type], startStr, endStr, 'monthly')
        
        jobs.push({
          jobKey,
          brandId,
          connectionId,
          accountId,
          level: 'campaign',
          breakdownTypes: [breakdown.type],
          dateFrom: startStr,
          dateTo: endStr,
          granularity: 'monthly',
          priority: 4
        })
      }
    }

    return jobs
  }

  /**
   * Generate deterministic job key to prevent duplicates
   */
  private generateJobKey(accountId: string, level: string, breakdownTypes: string[], dateFrom: string, dateTo: string, granularity: string): string {
    const breakdownStr = breakdownTypes.sort().join(',')
    return `meta:${accountId}:${level}:${breakdownStr}:${dateFrom}:${dateTo}:${granularity}`
  }

  /**
   * Queue jobs for processing with deduplication
   */
  private async queueJobs(jobs: DemographicsJob[]): Promise<number> {
    let jobsCreated = 0

    for (const job of jobs) {
      try {
        // Check if job already exists
        const { data: existingJob } = await this.supabase
          .from('meta_demographics_jobs_ledger_v2')
          .select('id, status')
          .eq('job_key', job.jobKey)
          .single()

        if (existingJob && existingJob.status !== 'failed') {
          continue // Skip if job exists and hasn't failed
        }

        // Insert or update job
        const { error } = await this.supabase
          .from('meta_demographics_jobs_ledger_v2')
          .upsert({
            brand_id: job.brandId,
            connection_id: job.connectionId,
            account_id: job.accountId,
            job_key: job.jobKey,
            breakdown_types: job.breakdownTypes,
            level: job.level,
            date_from: job.dateFrom,
            date_to: job.dateTo,
            granularity: job.granularity,
            status: 'pending',
            retry_count: 0,
            request_metadata: {
              priority: job.priority,
              created_by: 'comprehensive_sync',
              breakdown_configs: this.breakdownConfigs.filter(c => job.breakdownTypes.includes(c.type))
            }
          }, {
            onConflict: 'job_key'
          })

        if (!error) {
          jobsCreated++
        }
      } catch (error) {
        console.error(`Error queuing job ${job.jobKey}:`, error)
      }
    }

    return jobsCreated
  }

  /**
   * Initialize sync status for a brand
   */
  private async initializeSyncStatus(brandId: string, connectionId: string, accountId: string) {
    await this.supabase
      .from('meta_demographics_sync_status')
      .upsert({
        brand_id: brandId,
        connection_id: connectionId,
        account_id: accountId,
        total_days_target: 365,
        overall_status: 'in_progress',
        current_phase: 'historical',
        started_at: new Date().toISOString(),
        daily_api_limit: this.config.maxApiCallsPerMinute * 60 * 24 // Daily limit based on per-minute limit
      }, {
        onConflict: 'brand_id,account_id'
      })
  }

  /**
   * Process a single demographics job
   */
  async processJob(jobKey: string): Promise<{ success: boolean; rowsProcessed: number; error?: string }> {
    try {
      // Get job details
      const { data: job, error: jobError } = await this.supabase
        .from('meta_demographics_jobs_ledger_v2')
        .select('*')
        .eq('job_key', jobKey)
        .single()

      if (jobError || !job) {
        return { success: false, rowsProcessed: 0, error: 'Job not found' }
      }

      // Mark job as running
      await this.updateJobStatus(jobKey, 'running', { started_at: new Date().toISOString() })

      // Check rate limits
      const rateLimitOk = await this.checkRateLimit(job.brand_id, job.account_id)
      if (!rateLimitOk) {
        await this.updateJobStatus(jobKey, 'failed', { 
          error_message: 'Rate limit exceeded',
          next_retry_at: new Date(Date.now() + 3600000).toISOString() // Retry in 1 hour
        })
        return { success: false, rowsProcessed: 0, error: 'Rate limit exceeded' }
      }

      // Process the job
      const result = await this.fetchAndStoreMetaDemographics(job)

      if (result.success) {
        await this.updateJobStatus(jobKey, 'completed', {
          completed_at: new Date().toISOString(),
          rows_processed: result.rowsProcessed,
          rows_inserted: result.rowsInserted,
          rows_updated: result.rowsUpdated,
          api_calls_made: result.apiCallsMade
        })
      } else {
        await this.updateJobStatus(jobKey, 'failed', {
          failed_at: new Date().toISOString(),
          error_message: result.error,
          retry_count: (job.retry_count || 0) + 1
        })
      }

      return result
    } catch (error) {
      await this.updateJobStatus(jobKey, 'failed', {
        failed_at: new Date().toISOString(),
        error_message: error.message
      })
      return { success: false, rowsProcessed: 0, error: error.message }
    }
  }

  /**
   * Fetch demographics data from Meta API and store with deduplication
   */
  private async fetchAndStoreMetaDemographics(job: any): Promise<{
    success: boolean
    rowsProcessed: number
    rowsInserted: number
    rowsUpdated: number
    apiCallsMade: number
    error?: string
  }> {
    let apiCallsMade = 0
    let rowsProcessed = 0
    let rowsInserted = 0
    let rowsUpdated = 0

    try {
      // Get access token
      const { data: connection } = await this.supabase
        .from('platform_connections')
        .select('access_token, metadata')
        .eq('id', job.connection_id)
        .single()

      if (!connection?.access_token) {
        return { success: false, rowsProcessed: 0, rowsInserted: 0, rowsUpdated: 0, apiCallsMade: 0, error: 'No access token' }
      }

      // Process each breakdown type separately
      for (const breakdownType of job.breakdown_types) {
        const breakdownConfig = this.breakdownConfigs.find(c => c.type === breakdownType)
        if (!breakdownConfig) continue

        // Determine date chunking strategy based on granularity
        const dateChunks = this.createDateChunks(job.date_from, job.date_to, job.granularity)

        for (const chunk of dateChunks) {
          // Check Redis cache first
          const cacheKey = `demo:v2:${job.account_id}:${chunk.from}:${chunk.to}:${breakdownType}`
          let apiData = null

          if (this.redis) {
            const cached = await this.redis.get(cacheKey)
            if (cached) {
              apiData = JSON.parse(cached)
            }
          }

          // Fetch from Meta API if not cached
          if (!apiData) {
            apiData = await this.callMetaInsightsAPI(
              connection.access_token,
              job.account_id,
              chunk.from,
              chunk.to,
              breakdownType
            )
            apiCallsMade++

            // Cache the result
            if (this.redis && apiData) {
              await this.redis.setex(cacheKey, 3600, JSON.stringify(apiData)) // Cache for 1 hour
            }

            // Add delay to respect rate limits
            await this.sleep(300) // 300ms between API calls
          }

          if (apiData?.data) {
            // Process and store data with deduplication
            const storeResult = await this.storeMetaDemographicsData(
              job,
              breakdownType,
              chunk,
              apiData.data,
              breakdownConfig
            )
            
            rowsProcessed += storeResult.processed
            rowsInserted += storeResult.inserted
            rowsUpdated += storeResult.updated
          }
        }
      }

      return { success: true, rowsProcessed, rowsInserted, rowsUpdated, apiCallsMade }
    } catch (error) {
      return { success: false, rowsProcessed, rowsInserted, rowsUpdated, apiCallsMade, error: error.message }
    }
  }

  /**
   * Create date chunks based on granularity to avoid 504 timeouts
   */
  private createDateChunks(dateFrom: string, dateTo: string, granularity: string): { from: string; to: string }[] {
    const chunks: { from: string; to: string }[] = []
    const start = new Date(dateFrom)
    const end = new Date(dateTo)

    if (granularity === 'daily') {
      // For daily: process 7 days at a time
      let current = new Date(start)
      while (current <= end) {
        const chunkEnd = new Date(current)
        chunkEnd.setDate(chunkEnd.getDate() + 6) // 7-day chunks
        if (chunkEnd > end) chunkEnd.setTime(end.getTime())
        
        chunks.push({
          from: current.toISOString().split('T')[0],
          to: chunkEnd.toISOString().split('T')[0]
        })
        
        current.setDate(current.getDate() + 7)
      }
    } else {
      // For weekly/monthly: process the entire range at once since it's already aggregated
      chunks.push({ from: dateFrom, to: dateTo })
    }

    return chunks
  }

  /**
   * Call Meta Insights API with proper error handling
   */
  private async callMetaInsightsAPI(
    accessToken: string,
    accountId: string,
    dateFrom: string,
    dateTo: string,
    breakdownType: string
  ): Promise<any> {
    const baseUrl = `https://graph.facebook.com/v18.0/act_${accountId}/insights`
    
    // Map our breakdown types to Meta API breakdowns
    const metaBreakdowns: { [key: string]: string[] } = {
      'age_gender': ['age', 'gender'],
      'region': ['region'],
      'device_platform': ['device_platform'],
      'placement': ['publisher_platform', 'platform_position']
    }

    const breakdowns = metaBreakdowns[breakdownType] || [breakdownType]
    
    const params = new URLSearchParams({
      access_token: accessToken,
      fields: 'impressions,clicks,spend,reach,cpm,cpc,ctr,conversions,cost_per_action_type',
      breakdowns: breakdowns.join(','),
      time_range: JSON.stringify({
        since: dateFrom,
        until: dateTo
      }),
      time_increment: '1', // Daily data
      limit: '1000' // Max results per call
    })

    const response = await fetch(`${baseUrl}?${params.toString()}`)
    
    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Rate limit exceeded')
      }
      throw new Error(`Meta API error: ${response.status}`)
    }

    return await response.json()
  }

  /**
   * Store demographics data with smart deduplication and collapsing
   */
  private async storeMetaDemographicsData(
    job: any,
    breakdownType: string,
    dateChunk: { from: string; to: string },
    apiData: any[],
    breakdownConfig: BreakdownConfig
  ): Promise<{ processed: number; inserted: number; updated: number }> {
    let processed = 0
    let inserted = 0
    let updated = 0

    // Group and collapse low-volume data
    const groupedData = this.groupAndCollapseData(apiData, breakdownType, breakdownConfig)

    for (const item of groupedData) {
      try {
        // Create breakdown key
        const breakdownKey = this.createBreakdownKey(item, breakdownType)
        
        // Determine the date value based on granularity
        let dateValue: string
        if (job.granularity === 'weekly') {
          // Use the Monday of the week
          const date = new Date(dateChunk.from)
          const day = date.getDay()
          const monday = new Date(date)
          monday.setDate(date.getDate() - (day === 0 ? 6 : day - 1))
          dateValue = monday.toISOString().split('T')[0]
        } else if (job.granularity === 'monthly') {
          // Use the first day of the month
          const date = new Date(dateChunk.from)
          dateValue = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0]
        } else {
          // Daily - use the actual date
          dateValue = item.date_start || dateChunk.from
        }

        // Upsert into facts table (prevents duplicates)
        const { error } = await this.supabase
          .from('meta_demographics_facts')
          .upsert({
            brand_id: job.brand_id,
            connection_id: job.connection_id,
            account_id: job.account_id,
            level: job.level,
            level_id: 'account', // For now, store at account level
            level_name: job.account_id,
            grain: job.granularity === 'daily' ? 'day' : job.granularity === 'weekly' ? 'week' : 'month',
            date_value: dateValue,
            breakdown_type: breakdownType,
            breakdown_key: breakdownKey,
            impressions: parseInt(item.impressions) || 0,
            clicks: parseInt(item.clicks) || 0,
            spend: parseFloat(item.spend) || 0,
            reach: parseInt(item.reach) || 0,
            conversions: parseInt(item.conversions) || 0,
            cpm: parseFloat(item.cpm) || 0,
            cpc: parseFloat(item.cpc) || 0,
            ctr: parseFloat(item.ctr) || 0,
            cost_per_conversion: parseFloat(item.cost_per_action_type?.[0]?.value) || 0,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'brand_id,account_id,level,level_id,grain,date_value,breakdown_type,breakdown_key'
          })

        if (error) {
          console.error('Error storing demographics data:', error)
        } else {
          processed++
          // Note: Supabase upsert doesn't tell us if it was insert vs update
          // We'll count all as "processed" for simplicity
          inserted++
        }
      } catch (error) {
        console.error('Error processing item:', error)
      }
    }

    return { processed, inserted, updated }
  }

  /**
   * Group data and collapse low-volume entries to "Other"
   */
  private groupAndCollapseData(apiData: any[], breakdownType: string, config: BreakdownConfig): any[] {
    // Sort by impressions descending
    const sorted = apiData.sort((a, b) => (parseInt(b.impressions) || 0) - (parseInt(a.impressions) || 0))
    
    // Take top N values, collapse the rest to "Other"
    const topItems = sorted.slice(0, config.maxValues)
    const otherItems = sorted.slice(config.maxValues)
    
    // Also collapse items below threshold
    const aboveThreshold = topItems.filter(item => (parseInt(item.impressions) || 0) >= config.collapseThreshold)
    const belowThreshold = topItems.filter(item => (parseInt(item.impressions) || 0) < config.collapseThreshold)
    
    const result = [...aboveThreshold]
    
    // Aggregate "Other" category if we have items to collapse
    if (otherItems.length > 0 || belowThreshold.length > 0) {
      const allOtherItems = [...otherItems, ...belowThreshold]
      const otherAggregate = {
        impressions: allOtherItems.reduce((sum, item) => sum + (parseInt(item.impressions) || 0), 0).toString(),
        clicks: allOtherItems.reduce((sum, item) => sum + (parseInt(item.clicks) || 0), 0).toString(),
        spend: allOtherItems.reduce((sum, item) => sum + (parseFloat(item.spend) || 0), 0).toString(),
        reach: allOtherItems.reduce((sum, item) => sum + (parseInt(item.reach) || 0), 0).toString(),
        conversions: allOtherItems.reduce((sum, item) => sum + (parseInt(item.conversions) || 0), 0).toString(),
        date_start: allOtherItems[0]?.date_start,
        date_stop: allOtherItems[0]?.date_stop,
        // Set breakdown values to "Other"
        age: 'Other',
        gender: 'Other',
        region: 'Other',
        device_platform: 'Other',
        publisher_platform: 'Other',
        platform_position: 'Other'
      }
      
      // Calculate derived metrics
      if (otherAggregate.impressions > 0) {
        otherAggregate.cpm = (parseFloat(otherAggregate.spend) / parseInt(otherAggregate.impressions) * 1000).toString()
        otherAggregate.ctr = (parseInt(otherAggregate.clicks) / parseInt(otherAggregate.impressions) * 100).toString()
      }
      if (otherAggregate.clicks > 0) {
        otherAggregate.cpc = (parseFloat(otherAggregate.spend) / parseInt(otherAggregate.clicks)).toString()
      }
      
      result.push(otherAggregate)
    }

    return result
  }

  /**
   * Create breakdown key from API response
   */
  private createBreakdownKey(item: any, breakdownType: string): string {
    switch (breakdownType) {
      case 'age_gender':
        return `${item.age || 'unknown'}|${item.gender || 'unknown'}`
      case 'region':
        return item.region || 'unknown'
      case 'device_platform':
        return item.device_platform || 'unknown'
      case 'placement':
        return `${item.publisher_platform || 'unknown'}|${item.platform_position || 'unknown'}`
      default:
        return 'unknown'
    }
  }

  /**
   * Check rate limits before making API calls
   */
  private async checkRateLimit(brandId: string, accountId: string): Promise<boolean> {
    if (!this.redis) return true // No rate limiting without Redis

    const key = `rate_limit:meta:${accountId}`
    const current = await this.redis.get(key)
    const count = parseInt(current || '0')

    if (count >= this.config.maxApiCallsPerMinute) {
      return false
    }

    // Increment counter with 1-minute expiry
    await this.redis.setex(key, 60, count + 1)
    return true
  }

  /**
   * Update job status in the ledger
   */
  private async updateJobStatus(jobKey: string, status: string, updates: any = {}) {
    await this.supabase
      .from('meta_demographics_jobs_ledger_v2')
      .update({
        status,
        updated_at: new Date().toISOString(),
        ...updates
      })
      .eq('job_key', jobKey)
  }

  /**
   * Get sync progress for a brand
   */
  async getSyncProgress(brandId: string): Promise<{
    overall_status: string
    progress_percentage: number
    days_completed: number
    total_days_target: number
    current_phase: string
    estimated_completion?: string
  }> {
    const { data: status } = await this.supabase
      .from('meta_demographics_sync_status')
      .select('*')
      .eq('brand_id', brandId)
      .single()

    if (!status) {
      return {
        overall_status: 'not_started',
        progress_percentage: 0,
        days_completed: 0,
        total_days_target: 365,
        current_phase: 'pending'
      }
    }

    const progressPercentage = Math.round((status.days_completed / status.total_days_target) * 100)
    
    return {
      overall_status: status.overall_status,
      progress_percentage: progressPercentage,
      days_completed: status.days_completed,
      total_days_target: status.total_days_target,
      current_phase: status.current_phase,
      estimated_completion: this.estimateCompletion(status)
    }
  }

  /**
   * Get demographics data for widgets with intelligent querying
   */
  async getDemographicsForWidget(
    brandId: string,
    dateFrom: string,
    dateTo: string,
    breakdownType: string,
    level: string = 'campaign'
  ): Promise<any[]> {
    // Determine which granularity to use based on date range
    const daysDiff = Math.ceil((new Date(dateTo).getTime() - new Date(dateFrom).getTime()) / (1000 * 60 * 60 * 24))
    
    let grain: string
    if (daysDiff <= 35) {
      grain = 'day'
    } else if (daysDiff <= 180) {
      grain = 'week'
    } else {
      grain = 'month'
    }

    // Query the facts table
    const { data, error } = await this.supabase
      .from('meta_demographics_facts')
      .select('*')
      .eq('brand_id', brandId)
      .eq('level', level)
      .eq('grain', grain)
      .eq('breakdown_type', breakdownType)
      .gte('date_value', dateFrom)
      .lte('date_value', dateTo)
      .order('date_value', { ascending: true })

    if (error) {
      console.error('Error fetching demographics data:', error)
      return []
    }

    return data || []
  }

  /**
   * Rollover old data to higher granularity (daily → weekly → monthly)
   */
  async performDataRollover(): Promise<{ success: boolean; message: string }> {
    try {
      const today = new Date()
      
      // Rollover 1: Daily → Weekly (data older than 35 days)
      const weeklyRolloverDate = new Date(today)
      weeklyRolloverDate.setDate(weeklyRolloverDate.getDate() - 35)
      
      await this.rolloverToWeekly(weeklyRolloverDate)
      
      // Rollover 2: Weekly → Monthly (data older than 180 days)
      const monthlyRolloverDate = new Date(today)
      monthlyRolloverDate.setDate(monthlyRolloverDate.getDate() - 180)
      
      await this.rolloverToMonthly(monthlyRolloverDate)
      
      return { success: true, message: 'Data rollover completed successfully' }
    } catch (error) {
      return { success: false, message: `Rollover failed: ${error.message}` }
    }
  }

  /**
   * Rollover daily data to weekly aggregates
   */
  private async rolloverToWeekly(cutoffDate: Date) {
    const cutoffStr = cutoffDate.toISOString().split('T')[0]
    
    // Aggregate daily data into weekly buckets
    const { error } = await this.supabase.rpc('rollover_daily_to_weekly', {
      cutoff_date: cutoffStr
    })

    if (error) {
      console.error('Error in weekly rollover:', error)
    }
  }

  /**
   * Rollover weekly data to monthly aggregates
   */
  private async rolloverToMonthly(cutoffDate: Date) {
    const cutoffStr = cutoffDate.toISOString().split('T')[0]
    
    // Aggregate weekly data into monthly buckets
    const { error } = await this.supabase.rpc('rollover_weekly_to_monthly', {
      cutoff_date: cutoffStr
    })

    if (error) {
      console.error('Error in monthly rollover:', error)
    }
  }

  // Helper methods
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private estimateCompletion(status: any): string | undefined {
    if (!status.started_at || status.days_completed === 0) return undefined
    
    const elapsed = Date.now() - new Date(status.started_at).getTime()
    const daysPerMs = status.days_completed / elapsed
    const remainingDays = status.total_days_target - status.days_completed
    const estimatedMs = remainingDays / daysPerMs
    
    return new Date(Date.now() + estimatedMs).toISOString()
  }
}

export default MetaDemographicsService
export { MetaDemographicsService }
