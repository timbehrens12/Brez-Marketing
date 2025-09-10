import { Job } from 'bull'
import { metaQueue, MetaJobType, MetaJobData, MetaHistoricalJobData, MetaQueueService } from '@/lib/services/metaQueueService'
import { createClient } from '@/lib/supabase/server'

/**
 * Meta Worker - Processes Meta sync queue jobs
 */
export class MetaWorker {
  static isInitialized = false
  
  static initialize() {
    if (this.isInitialized) {
      console.log('[Meta Worker] Already initialized, skipping...')
      return
    }
    
    console.log('[Meta Worker] Initializing Meta worker...')
    
    // Process different Meta job types
    metaQueue.process(MetaJobType.RECENT_SYNC, 3, this.processRecentSync.bind(this))
    metaQueue.process(MetaJobType.HISTORICAL_CAMPAIGNS, 2, this.processHistoricalCampaigns.bind(this))
    metaQueue.process(MetaJobType.HISTORICAL_DEMOGRAPHICS, 2, this.processHistoricalDemographics.bind(this))
    metaQueue.process(MetaJobType.HISTORICAL_INSIGHTS, 1, this.processHistoricalInsights.bind(this))
    metaQueue.process(MetaJobType.DAILY_SYNC, 5, this.processDailySync.bind(this))
    metaQueue.process(MetaJobType.RECONCILE, 1, this.processReconcile.bind(this))
    
    this.isInitialized = true
    
    // Error handling
    metaQueue.on('error', (error) => {
      console.error('[Meta Worker] Queue error:', error)
    })
    
    metaQueue.on('failed', (job, err) => {
      console.error(`[Meta Worker] Job ${job.id} failed:`, err)
      // Update ETL job status if available
      if (job.data.etlJobId) {
        MetaQueueService.updateEtlJob(job.data.etlJobId, {
          status: 'failed',
          error_message: err.message
        }).catch(console.error)
      }
    })
    
    metaQueue.on('completed', (job) => {
      console.log(`[Meta Worker] Job ${job.id} completed successfully`)
      // Update ETL job status if available
      if (job.data.etlJobId) {
        MetaQueueService.updateEtlJob(job.data.etlJobId, {
          status: 'completed',
          progress_pct: 100,
          completed_at: new Date().toISOString()
        }).catch(console.error)
      }
    })
    
    console.log('[Meta Worker] Meta worker initialized')
  }

  /**
   * Process recent sync job - last 7 days for immediate UI
   */
  static async processRecentSync(job: Job<MetaJobData>): Promise<void> {
    const { brandId, connectionId, accessToken, accountId } = job.data

    console.log(`[Meta Worker] 🚀 Processing recent sync for brand ${brandId}`)

    try {
      // Get fresh access token from database
      const { accessToken: freshToken, error: tokenError } = await this.getFreshAccessToken(connectionId)
      if (tokenError || !freshToken) {
        throw new Error(`Failed to get fresh access token: ${tokenError || 'Token not found'}`)
      }

      // Import Meta service
      const { fetchMetaAdInsights } = await import('@/lib/services/meta-service')
      
      // EMERGENCY FIX: Sync last 90 days for comprehensive data during "Syncing" status
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 90) // Extended from 7 to 90 days
      
      console.log(`[Meta Worker] Syncing recent data: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`)
      
      const result = await fetchMetaAdInsights(brandId, startDate, endDate, false)
      
      if (!result.success) {
        throw new Error(`Recent sync failed: ${result.error}`)
      }
      
      console.log(`[Meta Worker] ✅ Recent sync completed for brand ${brandId}`)
      
      // Update connection sync status to completed
      await this.updateConnectionSyncStatus(connectionId, 'completed')
      
    } catch (error) {
      console.error(`[Meta Worker] Recent sync failed for brand ${brandId}:`, error)
      // Update connection sync status to failed
      await this.updateConnectionSyncStatus(connectionId, 'failed')
      throw error
    }
  }

  /**
   * Process historical campaigns job - chunk by chunk
   */
  static async processHistoricalCampaigns(job: Job<MetaHistoricalJobData>): Promise<void> {
    const { brandId, connectionId, accessToken, accountId, startDate, endDate, metadata } = job.data

    console.log(`[Meta Worker] 📊 Processing historical campaigns chunk ${metadata?.chunkNumber}/${metadata?.totalChunks} for brand ${brandId}`)
    console.log(`[Meta Worker] Date range: ${startDate} to ${endDate}`)

    try {
      // Get fresh access token
      const { accessToken: freshToken, error: tokenError } = await this.getFreshAccessToken(connectionId)
      if (tokenError || !freshToken) {
        throw new Error(`Failed to get fresh access token: ${tokenError || 'Token not found'}`)
      }

      // Import Meta service
      const { fetchMetaAdInsights } = await import('@/lib/services/meta-service')
      
      const start = new Date(startDate!)
      const end = new Date(endDate!)
      
      // Update ETL job to processing
      if (job.data.etlJobId) {
        await MetaQueueService.updateEtlJob(job.data.etlJobId, {
          status: 'processing',
          progress_pct: 0
        })
      }
      
      // Fetch campaign data for this chunk
      const result = await fetchMetaAdInsights(brandId, start, end, false)
      
      if (!result.success) {
        throw new Error(`Historical campaigns sync failed for chunk ${metadata?.chunkNumber}: ${result.error}`)
      }
      
      // Update progress
      const progressPct = metadata?.chunkNumber && metadata?.totalChunks ? 
        Math.round((metadata.chunkNumber / metadata.totalChunks) * 100) : 100
      
      if (job.data.etlJobId) {
        await MetaQueueService.updateEtlJob(job.data.etlJobId, {
          status: 'processing',
          progress_pct: progressPct,
          rows_written: result.count || 0
        })
      }
      
      console.log(`[Meta Worker] ✅ Historical campaigns chunk ${metadata?.chunkNumber}/${metadata?.totalChunks} completed for brand ${brandId}`)
      
    } catch (error) {
      console.error(`[Meta Worker] Historical campaigns failed for brand ${brandId}:`, error)
      throw error
    }
  }

  /**
   * Process historical demographics job - chunk by chunk
   */
  static async processHistoricalDemographics(job: Job<MetaHistoricalJobData>): Promise<void> {
    const { brandId, connectionId, accessToken, accountId, startDate, endDate, metadata } = job.data

    console.log(`[Meta Worker] 👥 Processing historical demographics chunk ${metadata?.chunkNumber}/${metadata?.totalChunks} for brand ${brandId}`)
    console.log(`[Meta Worker] Date range: ${startDate} to ${endDate}`)

    try {
      // Get fresh access token
      const { accessToken: freshToken, error: tokenError } = await this.getFreshAccessToken(connectionId)
      if (tokenError || !freshToken) {
        throw new Error(`Failed to get fresh access token: ${tokenError || 'Token not found'}`)
      }

      // Import Meta service for demographic data
      const { fetchMetaAdInsights } = await import('@/lib/services/meta-service')
      
      const start = new Date(startDate!)
      const end = new Date(endDate!)
      
      // Update ETL job to processing
      if (job.data.etlJobId) {
        await MetaQueueService.updateEtlJob(job.data.etlJobId, {
          status: 'processing',
          progress_pct: 0
        })
      }
      
      // Fetch demographic data for this chunk (age, gender, device, placement breakdowns)
      const result = await fetchMetaAdInsights(brandId, start, end, true) // true for demographics
      
      if (!result.success) {
        throw new Error(`Historical demographics sync failed for chunk ${metadata?.chunkNumber}: ${result.error}`)
      }
      
      // Update progress
      const progressPct = metadata?.chunkNumber && metadata?.totalChunks ? 
        Math.round((metadata.chunkNumber / metadata.totalChunks) * 100) : 100
      
      if (job.data.etlJobId) {
        await MetaQueueService.updateEtlJob(job.data.etlJobId, {
          status: 'processing',
          progress_pct: progressPct,
          rows_written: result.count || 0
        })
      }
      
      console.log(`[Meta Worker] ✅ Historical demographics chunk ${metadata?.chunkNumber}/${metadata?.totalChunks} completed for brand ${brandId}`)
      
    } catch (error) {
      console.error(`[Meta Worker] Historical demographics failed for brand ${brandId}:`, error)
      throw error
    }
  }

  /**
   * Process historical insights job - comprehensive daily stats
   */
  static async processHistoricalInsights(job: Job<MetaHistoricalJobData>): Promise<void> {
    const { brandId, connectionId, accessToken, accountId, startDate, endDate, metadata } = job.data

    console.log(`[Meta Worker] 📈 Processing historical insights chunk ${metadata?.chunkNumber}/${metadata?.totalChunks} for brand ${brandId}`)
    console.log(`[Meta Worker] Date range: ${startDate} to ${endDate}`)

    try {
      // Get fresh access token
      const { accessToken: freshToken, error: tokenError } = await this.getFreshAccessToken(connectionId)
      if (tokenError || !freshToken) {
        throw new Error(`Failed to get fresh access token: ${tokenError || 'Token not found'}`)
      }

      // Import Meta service
      const { fetchMetaAdInsights } = await import('@/lib/services/meta-service')
      
      const start = new Date(startDate!)
      const end = new Date(endDate!)
      
      // Update ETL job to processing
      if (job.data.etlJobId) {
        await MetaQueueService.updateEtlJob(job.data.etlJobId, {
          status: 'processing',
          progress_pct: 0
        })
      }
      
      // Fetch comprehensive insights data for this chunk
      const result = await fetchMetaAdInsights(brandId, start, end, false)
      
      if (!result.success) {
        throw new Error(`Historical insights sync failed for chunk ${metadata?.chunkNumber}: ${result.error}`)
      }
      
      // Update progress
      const progressPct = metadata?.chunkNumber && metadata?.totalChunks ? 
        Math.round((metadata.chunkNumber / metadata.totalChunks) * 100) : 100
      
      if (job.data.etlJobId) {
        await MetaQueueService.updateEtlJob(job.data.etlJobId, {
          status: 'processing',
          progress_pct: progressPct,
          rows_written: result.count || 0
        })
      }
      
      console.log(`[Meta Worker] ✅ Historical insights chunk ${metadata?.chunkNumber}/${metadata?.totalChunks} completed for brand ${brandId}`)
      
    } catch (error) {
      console.error(`[Meta Worker] Historical insights failed for brand ${brandId}:`, error)
      throw error
    }
  }

  /**
   * Process daily sync job - ongoing maintenance
   */
  static async processDailySync(job: Job<MetaJobData>): Promise<void> {
    const { brandId, connectionId, accessToken, accountId } = job.data

    console.log(`[Meta Worker] 📅 Processing daily sync for brand ${brandId}`)

    try {
      // Get fresh access token
      const { accessToken: freshToken, error: tokenError } = await this.getFreshAccessToken(connectionId)
      if (tokenError || !freshToken) {
        throw new Error(`Failed to get fresh access token: ${tokenError || 'Token not found'}`)
      }

      // Import Meta service
      const { fetchMetaAdInsights } = await import('@/lib/services/meta-service')
      
      // Sync yesterday and today
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 1)
      
      const result = await fetchMetaAdInsights(brandId, startDate, endDate, false)
      
      if (!result.success) {
        throw new Error(`Daily sync failed: ${result.error}`)
      }
      
      console.log(`[Meta Worker] ✅ Daily sync completed for brand ${brandId}`)
      
    } catch (error) {
      console.error(`[Meta Worker] Daily sync failed for brand ${brandId}:`, error)
      throw error
    }
  }

  /**
   * Process reconcile job - data validation and cleanup
   */
  static async processReconcile(job: Job<MetaJobData>): Promise<void> {
    const { brandId } = job.data

    console.log(`[Meta Worker] 🔧 Processing reconciliation for brand ${brandId}`)

    try {
      const supabase = createClient()
      
      // Remove duplicate records
      await supabase.rpc('remove_duplicate_meta_campaigns', { brand_id_param: brandId })
      await supabase.rpc('remove_duplicate_meta_daily_stats', { brand_id_param: brandId })
      
      // Update calculated fields
      await supabase.rpc('recalculate_meta_metrics', { brand_id_param: brandId })
      
      console.log(`[Meta Worker] ✅ Reconciliation completed for brand ${brandId}`)
      
    } catch (error) {
      console.error(`[Meta Worker] Reconciliation failed for brand ${brandId}:`, error)
      throw error
    }
  }

  /**
   * Update connection sync status
   */
  static async updateConnectionSyncStatus(connectionId: string, status: 'completed' | 'failed'): Promise<void> {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('platform_connections')
        .update({
          sync_status: status,
          metadata: {
            queue_jobs_running: false,
            sync_completed_at: status === 'completed' ? new Date().toISOString() : null,
            sync_failed_at: status === 'failed' ? new Date().toISOString() : null
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', connectionId)
      
      if (error) {
        console.error(`[Meta Worker] Error updating connection sync status:`, error)
      } else {
        console.log(`[Meta Worker] ✅ Updated connection ${connectionId} sync status to ${status}`)
      }
    } catch (error) {
      console.error(`[Meta Worker] Error updating connection sync status:`, error)
    }
  }

  /**
   * Get fresh access token from database
   */
  static async getFreshAccessToken(connectionId: string): Promise<{ accessToken?: string, error?: string }> {
    try {
      const supabase = createClient()
      
      const { data: connection, error } = await supabase
        .from('platform_connections')
        .select('access_token, status')
        .eq('id', connectionId)
        .single()

      if (error) {
        return { error: `Database error: ${error.message}` }
      }

      if (!connection) {
        return { error: 'Connection not found' }
      }

      if (connection.status !== 'active') {
        return { error: `Connection status is ${connection.status}, expected active` }
      }

      if (!connection.access_token) {
        return { error: 'Access token not found' }
      }

      return { accessToken: connection.access_token }
    } catch (error) {
      return { error: `Failed to fetch access token: ${error}` }
    }
  }

  /**
   * Initialize worker (called when app starts)
   */
  static start() {
    // Only initialize if worker mode is enabled or in production
    const workerMode = process.env.WORKER_MODE === 'true' || process.env.NODE_ENV === 'production'
    
    if (workerMode) {
      this.initialize()
      console.log('[Meta Worker] Worker mode enabled - processing Meta jobs')
    } else {
      console.log('[Meta Worker] Worker mode disabled - skipping Meta job processing')
    }
  }

  /**
   * Graceful shutdown
   */
  static async shutdown(): Promise<void> {
    console.log('[Meta Worker] Shutting down Meta worker...')
    await metaQueue.close()
    console.log('[Meta Worker] Meta worker shutdown complete')
  }
}

// Auto-start worker in serverless environment
if (typeof window === 'undefined') {
  MetaWorker.start()
}
