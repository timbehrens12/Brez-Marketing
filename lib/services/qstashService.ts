import { Client } from '@upstash/qstash'

// Initialize QStash client
let qstashClient: Client | null = null

try {
  if (process.env.QSTASH_TOKEN) {
    qstashClient = new Client({
      token: process.env.QSTASH_TOKEN,
    })
    console.log('[QStash] ✅ Client initialized')
  } else {
    console.warn('[QStash] ⚠️ QSTASH_TOKEN not found - queue disabled')
  }
} catch (error) {
  console.error('[QStash] Failed to initialize client:', error)
}

// Job types
export enum MetaJobType {
  HISTORICAL_CHUNK = 'meta_historical_chunk',
  RECENT_SYNC = 'meta_recent_sync',
}

export interface MetaHistoricalChunkJob {
  brandId: string
  connectionId: string
  accessToken: string
  accountId: string
  startDate: string // ISO date
  endDate: string // ISO date
  chunkIndex: number
  totalChunks: number
}

export interface MetaRecentSyncJob {
  brandId: string
  connectionId: string
  accessToken: string
  accountId: string
}

/**
 * QStash Service - Serverless queue for Meta data backfill
 * Uses HTTP endpoints instead of Redis TCP connections
 */
export class QStashService {
  /**
   * Queue a 12-month historical backfill for Meta
   * Breaks it into 30-day chunks and queues each chunk
   */
  static async queueMetaHistoricalBackfill(
    brandId: string,
    connectionId: string,
    accessToken: string,
    accountId: string,
    accountCreatedDate?: string
  ): Promise<{ success: boolean; totalJobs: number; estimatedMinutes: number }> {
    if (!qstashClient) {
      console.warn('[QStash] Client not initialized - skipping queue')
      return { success: false, totalJobs: 0, estimatedMinutes: 0 }
    }

    try {
      console.log(`[QStash] Starting 12-month backfill for brand ${brandId}`)

      // Calculate 12-month date range
      const endDate = new Date()
      const startDate = new Date()
      startDate.setFullYear(startDate.getFullYear() - 1) // 12 months ago

      // Create 30-day chunks
      const chunks: { start: string; end: string }[] = []
      let current = new Date(startDate)

      while (current <= endDate) {
        const chunkStart = new Date(current)
        const chunkEnd = new Date(current)
        chunkEnd.setDate(chunkEnd.getDate() + 29) // 30 days

        if (chunkEnd > endDate) {
          chunkEnd.setTime(endDate.getTime())
        }

        chunks.push({
          start: chunkStart.toISOString().split('T')[0],
          end: chunkEnd.toISOString().split('T')[0],
        })

        current = new Date(chunkEnd)
        current.setDate(current.getDate() + 1)
      }

      console.log(`[QStash] Created ${chunks.length} 30-day chunks`)

      // Queue each chunk as a separate job
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.brezmarketingdashboard.com'
      const workerUrl = `${baseUrl}/api/qstash/meta-worker`

      let queuedJobs = 0

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]
        const jobData: MetaHistoricalChunkJob = {
          brandId,
          connectionId,
          accessToken,
          accountId,
          startDate: chunk.start,
          endDate: chunk.end,
          chunkIndex: i,
          totalChunks: chunks.length,
        }

        try {
          // Queue job with QStash - it will POST to our worker endpoint
          await qstashClient.publishJSON({
            url: workerUrl,
            body: {
              type: MetaJobType.HISTORICAL_CHUNK,
              data: jobData,
            },
            // Delay each chunk by 10 seconds to avoid rate limits
            delay: i * 10,
            // Retry failed jobs up to 3 times
            retries: 3,
          })

          queuedJobs++
          console.log(`[QStash] ✅ Queued chunk ${i + 1}/${chunks.length}: ${chunk.start} → ${chunk.end}`)
        } catch (jobError) {
          console.error(`[QStash] ❌ Failed to queue chunk ${i + 1}:`, jobError)
        }
      }

      const estimatedMinutes = Math.ceil(chunks.length * 0.5) // ~30 seconds per chunk

      console.log(`[QStash] 🎉 Queued ${queuedJobs}/${chunks.length} jobs, estimated: ${estimatedMinutes} minutes`)

      return {
        success: queuedJobs > 0,
        totalJobs: queuedJobs,
        estimatedMinutes,
      }
    } catch (error) {
      console.error('[QStash] Error queuing historical backfill:', error)
      return { success: false, totalJobs: 0, estimatedMinutes: 0 }
    }
  }

  /**
   * Queue a recent sync (last 7 days) for immediate UI update
   */
  static async queueMetaRecentSync(
    brandId: string,
    connectionId: string,
    accessToken: string,
    accountId: string
  ): Promise<{ success: boolean }> {
    if (!qstashClient) {
      console.warn('[QStash] Client not initialized - skipping queue')
      return { success: false }
    }

    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.brezmarketingdashboard.com'
      const workerUrl = `${baseUrl}/api/qstash/meta-worker`

      const jobData: MetaRecentSyncJob = {
        brandId,
        connectionId,
        accessToken,
        accountId,
      }

      await qstashClient.publishJSON({
        url: workerUrl,
        body: {
          type: MetaJobType.RECENT_SYNC,
          data: jobData,
        },
        retries: 3,
      })

      console.log(`[QStash] ✅ Queued recent sync for brand ${brandId}`)

      return { success: true }
    } catch (error) {
      console.error('[QStash] Error queuing recent sync:', error)
      return { success: false }
    }
  }
}

