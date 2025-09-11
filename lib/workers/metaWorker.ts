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
   * Helper method to update ETL job progress
   */
  static async updateEtlProgress(etlJobId: number | undefined, updates: any): Promise<void> {
    if (!etlJobId) return

    try {
      await MetaQueueService.updateEtlJob(etlJobId, updates)
    } catch (error) {
      console.error(`[Meta Worker] Failed to update ETL job ${etlJobId}:`, error)
    }
  }

  /**
   * Process recent sync job - last 7 days for immediate UI
   */
  static async processRecentSync(job: Job<MetaJobData>): Promise<void> {
    const { brandId, connectionId, accessToken, accountId, etlJobId } = job.data

    console.log(`[Meta Worker] 🚀 Processing recent sync for brand ${brandId}`)

    try {
      // Update ETL job to in_progress
      await this.updateEtlProgress(etlJobId, {
        status: 'in_progress',
        progress_pct: 10
      })

      // Get fresh access token from database
      const { accessToken: freshToken, error: tokenError } = await this.getFreshAccessToken(connectionId, brandId)
      if (tokenError || !freshToken) {
        // Handle special cases where connection was deleted but brand has other connections
        if (freshToken === 'orphaned' || freshToken === 'new_brand') {
          console.log(`[Meta Worker] ${freshToken === 'orphaned' ? 'Orphaned connection' : 'New brand'} - completing job successfully`)
          await this.updateEtlProgress(etlJobId, {
            status: 'completed',
            progress_pct: 100
          })
          return
        }
        throw new Error(`Failed to get fresh access token: ${tokenError || 'Token not found'}`)
      }

      // Update ETL job progress
      await this.updateEtlProgress(etlJobId, { progress_pct: 25 })

      // Import Meta service
      const { fetchMetaAdInsights } = await import('@/lib/services/meta-service')

      // FIXED: Sync last 12 months (within Meta's reach limitation)
      const endDate = new Date()
      const startDate = new Date()
      startDate.setMonth(startDate.getMonth() - 12) // Exactly 12 months to stay within Meta's 13-month reach limit

      console.log(`[Meta Worker] Syncing recent data: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`)

      // Update ETL job progress
      await this.updateEtlProgress(etlJobId, { progress_pct: 50 })

      const result = await fetchMetaAdInsights(brandId, startDate, endDate, false)

      if (!result.success) {
        await this.updateEtlProgress(etlJobId, {
          status: 'failed',
          error_message: result.error
        })
        throw new Error(`Recent sync failed: ${result.error}`)
      }

      // Update ETL job progress
      await this.updateEtlProgress(etlJobId, {
        progress_pct: 90,
        rows_written: result.count
      })

      console.log(`[Meta Worker] ✅ Recent sync completed for brand ${brandId}`)

      // Update connection sync status to completed
      await this.updateConnectionSyncStatus(connectionId, 'completed')

      // Mark ETL job as completed
      await this.updateEtlProgress(etlJobId, {
        status: 'completed',
        progress_pct: 100,
        completed_at: new Date().toISOString()
      })

    } catch (error) {
      console.error(`[Meta Worker] Recent sync failed for brand ${brandId}:`, error)
      // Update ETL job status to failed
      await this.updateEtlProgress(etlJobId, {
        status: 'failed',
        error_message: error.message
      })
      // Update connection sync status to failed
      await this.updateConnectionSyncStatus(connectionId, 'failed')
      throw error
    }
  }

  /**
   * Process historical campaigns job - chunk by chunk
   */
  static async processHistoricalCampaigns(job: Job<MetaHistoricalJobData>): Promise<void> {
    const { brandId, connectionId, accessToken, accountId, startDate, endDate, metadata, etlJobId } = job.data

    console.log(`[Meta Worker] 📊 Processing historical campaigns chunk ${metadata?.chunkNumber}/${metadata?.totalChunks} for brand ${brandId}`)
    console.log(`[Meta Worker] Date range: ${startDate} to ${endDate}`)

    try {
      // Update ETL job to in_progress
      await this.updateEtlProgress(etlJobId, {
        status: 'in_progress',
        progress_pct: 10
      })

      // Get fresh access token
      const { accessToken: freshToken, error: tokenError } = await this.getFreshAccessToken(connectionId, brandId)
      if (tokenError || !freshToken) {
        // Handle special cases where connection was deleted but brand has other connections
        if (freshToken === 'orphaned' || freshToken === 'new_brand') {
          console.log(`[Meta Worker] ${freshToken === 'orphaned' ? 'Orphaned connection' : 'New brand'} - completing job successfully`)
          await this.updateEtlProgress(etlJobId, {
            status: 'completed',
            progress_pct: 100
          })
          return
        }
        throw new Error(`Failed to get fresh access token: ${tokenError || 'Token not found'}`)
      }

      // Update ETL job progress
      await this.updateEtlProgress(etlJobId, { progress_pct: 25 })

      // Import Meta backfill service
      const { DataBackfillService } = await import('@/lib/services/dataBackfillService')

      const start = new Date(startDate!)
      const end = new Date(endDate!)

      // Update ETL job progress
      await this.updateEtlProgress(etlJobId, { progress_pct: 50 })

      // Fetch campaign data for this chunk using the proper backfill service
      console.log(`[Meta Worker] Fetching campaigns for date range: ${startDate} to ${endDate}`)
      const dateRange = {
        since: startDate,
        until: endDate
      }

      try {
        await DataBackfillService.backfillMetaData(brandId, accountId, freshToken, dateRange)

        // Update ETL job progress
        await this.updateEtlProgress(etlJobId, {
          progress_pct: 90,
          rows_written: 1 // We'll track actual counts later
        })

        console.log(`[Meta Worker] ✅ Historical campaigns chunk ${metadata?.chunkNumber} completed`)
      } catch (backfillError) {
        console.error(`[Meta Worker] Backfill failed:`, backfillError)
        throw new Error(`Historical campaigns sync failed for chunk ${metadata?.chunkNumber}: ${backfillError instanceof Error ? backfillError.message : 'Unknown error'}`)
      }

      // Mark ETL job as completed
      await this.updateEtlProgress(etlJobId, {
        status: 'completed',
        progress_pct: 100,
        completed_at: new Date().toISOString()
      })

    } catch (error) {
      console.error(`[Meta Worker] Historical campaigns failed for chunk ${metadata?.chunkNumber}:`, error)
      // Update ETL job status to failed
      await this.updateEtlProgress(etlJobId, {
        status: 'failed',
        error_message: error.message
      })
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
      const { accessToken: freshToken, error: tokenError } = await this.getFreshAccessToken(connectionId, brandId)
      if (tokenError || !freshToken) {
        // Handle special cases where connection was deleted but brand has other connections
        if (freshToken === 'orphaned' || freshToken === 'new_brand') {
          console.log(`[Meta Worker] ${freshToken === 'orphaned' ? 'Orphaned connection' : 'New brand'} - completing job successfully`)
          return
        }
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
      // Note: Demographics processing can be slow, but for historical data we need it
      const result = await fetchMetaAdInsights(brandId, start, end, false) // false for dryRun, demographics will be processed
      
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
      const { accessToken: freshToken, error: tokenError } = await this.getFreshAccessToken(connectionId, brandId)
      if (tokenError || !freshToken) {
        // Handle special cases where connection was deleted but brand has other connections
        if (freshToken === 'orphaned' || freshToken === 'new_brand') {
          console.log(`[Meta Worker] ${freshToken === 'orphaned' ? 'Orphaned connection' : 'New brand'} - completing job successfully`)
          return
        }
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
      const { accessToken: freshToken, error: tokenError } = await this.getFreshAccessToken(connectionId, brandId)
      if (tokenError || !freshToken) {
        // Handle special cases where connection was deleted but brand has other connections
        if (freshToken === 'orphaned' || freshToken === 'new_brand') {
          console.log(`[Meta Worker] ${freshToken === 'orphaned' ? 'Orphaned connection' : 'New brand'} - completing job successfully`)
          return
        }
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
  static async getFreshAccessToken(connectionId: string, brandId?: string): Promise<{ accessToken?: string, error?: string }> {
    try {
      const supabase = createClient()
      
      // First check if ANY connection exists with this ID (regardless of status)
      const { data: anyConnection, error: anyError } = await supabase
        .from('platform_connections')
        .select('id, status, platform_type, brand_id, access_token')
        .eq('id', connectionId)
        .maybeSingle()

      if (anyError) {
        console.error('[Meta Worker] Error checking connection existence:', anyError)
        return { error: anyError.message }
      }

      if (!anyConnection) {
        console.error(`[Meta Worker] Connection ${connectionId} does not exist! Checking if job should be cancelled.`)

        // Check if we have a brandId to work with
        if (brandId) {
          // Check what connections DO exist for this brand
          const { data: brandConnections } = await supabase
            .from('platform_connections')
            .select('id, status, platform_type, brand_id, created_at')
            .eq('platform_type', 'meta')
            .eq('brand_id', brandId)
            .order('created_at', { ascending: false })

          console.log(`[Meta Worker] Brand ${brandId} has ${brandConnections?.length || 0} Meta connections:`, brandConnections)

          if (brandConnections && brandConnections.length > 0) {
            // Brand has other connections - this specific connection was deleted
            // This is likely an orphaned job, we should complete it successfully
            console.log(`[Meta Worker] Connection ${connectionId} was deleted but brand has other connections. Completing job successfully.`)
            return { accessToken: 'orphaned', error: 'Connection deleted but brand has other connections' }
          } else {
            // Brand has no connections at all - this might be a legitimate error
            console.error(`[Meta Worker] Brand ${brandId} has no Meta connections at all!`)

            // Check if this is a recent brand (less than 1 hour old)
            const { data: brand } = await supabase
              .from('brands')
              .select('created_at')
              .eq('id', brandId)
              .single()

            if (brand) {
              const brandAge = Date.now() - new Date(brand.created_at).getTime()
              const oneHour = 60 * 60 * 1000

              if (brandAge < oneHour) {
                console.log(`[Meta Worker] Brand is only ${Math.round(brandAge / 1000 / 60)} minutes old - might be connection setup in progress`)
                return { accessToken: 'new_brand', error: 'Brand too new - connection setup may be in progress' }
              }
            }

            // This is a hard error - the job should not be retried
            throw new Error(`FATAL: No Meta connections found for brand ${brandId}`)
          }
        } else {
          // No brandId in job data - this is a malformed job
          console.error(`[Meta Worker] Job missing brandId in data:`, job.data)
          throw new Error('FATAL: Job missing brandId - malformed job data')
        }
      }

      // Log the connection status for debugging
      console.log(`[Meta Worker] Found connection ${connectionId}:`, {
        status: anyConnection.status,
        platform_type: anyConnection.platform_type,
        brand_id: anyConnection.brand_id,
        has_token: !!anyConnection.access_token,
        token_length: anyConnection.access_token?.length || 0
      })

      if (anyConnection.status !== 'active') {
        console.error(`[Meta Worker] Connection ${connectionId} status is '${anyConnection.status}', not 'active'`)
        return { error: `Connection status is ${anyConnection.status}, not active` }
      }

      if (!anyConnection.access_token || anyConnection.access_token.length < 10) {
        console.error('[Meta Worker] Invalid or missing access token in connection:', connectionId)
        return { error: 'Invalid or missing access token in connection' }
      }

      console.log(`[Meta Worker] Retrieved access token for connection: ${connectionId}`)
      return { accessToken: anyConnection.access_token }
    } catch (error) {
      console.error('[Meta Worker] Error getting fresh access token:', error)
      return { error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Initialize worker (called when app starts)
   */
  static start() {
    // Always initialize in serverless environments to process jobs on-demand
    const isServerless = process.env.VERCEL || process.env.NETLIFY || !process.env.WORKER_MODE
    const workerMode = process.env.WORKER_MODE === 'true' || process.env.NODE_ENV === 'production' || isServerless

    if (workerMode) {
      this.initialize()
      console.log('[Meta Worker] Worker initialized - processing Meta jobs (serverless mode)')
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
  // Always start in serverless environments, regardless of WORKER_MODE
  const isServerless = process.env.VERCEL || process.env.NETLIFY || !process.env.WORKER_MODE
  if (isServerless || process.env.WORKER_MODE === 'true' || process.env.NODE_ENV === 'production') {
    MetaWorker.start()
  }
}
