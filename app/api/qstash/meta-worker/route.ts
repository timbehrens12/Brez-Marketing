import { NextRequest, NextResponse } from 'next/server'
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs'
import { MetaJobType, MetaHistoricalChunkJob, MetaRecentSyncJob } from '@/lib/services/qstashService'

/**
 * QStash Meta Worker - Processes Meta data sync jobs
 * This endpoint is called by QStash (not directly by users)
 */
async function handler(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, data } = body

    console.log(`[QStash Worker] Processing job type: ${type}`)

    switch (type) {
      case MetaJobType.HISTORICAL_CHUNK:
        return await processHistoricalChunk(data as MetaHistoricalChunkJob)

      case MetaJobType.RECENT_SYNC:
        return await processRecentSync(data as MetaRecentSyncJob)

      default:
        console.error(`[QStash Worker] Unknown job type: ${type}`)
        return NextResponse.json({ error: 'Unknown job type' }, { status: 400 })
    }
  } catch (error) {
    console.error('[QStash Worker] Error processing job:', error)
    return NextResponse.json(
      { error: 'Job processing failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * Process a historical data chunk (30 days of Meta data)
 */
async function processHistoricalChunk(job: MetaHistoricalChunkJob) {
  const { brandId, startDate, endDate, chunkIndex, totalChunks } = job

  console.log(`[QStash Worker] 🔄 Processing chunk ${chunkIndex + 1}/${totalChunks}: ${startDate} → ${endDate}`)

  try {
    // Import the Meta sync service
    const { fetchMetaAdInsights } = await import('@/lib/services/meta-service')

    // Fetch data for this chunk
    const result = await fetchMetaAdInsights(
      brandId,
      new Date(startDate),
      new Date(endDate),
      false, // not dry run
      chunkIndex > 0 // skip demographics after first chunk
    )

    if (result.success) {
      console.log(`[QStash Worker] ✅ Chunk ${chunkIndex + 1}/${totalChunks} complete: ${result.count || 0} records`)
      return NextResponse.json({
        success: true,
        chunk: chunkIndex + 1,
        total: totalChunks,
        records: result.count || 0,
      })
    } else {
      console.error(`[QStash Worker] ❌ Chunk ${chunkIndex + 1}/${totalChunks} failed:`, result.error)
      return NextResponse.json(
        { error: 'Chunk processing failed', details: result.error },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error(`[QStash Worker] ❌ Chunk ${chunkIndex + 1}/${totalChunks} exception:`, error)
    return NextResponse.json(
      { error: 'Chunk processing exception', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * Process a recent sync (last 7 days)
 */
async function processRecentSync(job: MetaRecentSyncJob) {
  const { brandId } = job

  console.log(`[QStash Worker] 🔄 Processing recent sync for brand ${brandId}`)

  try {
    const { fetchMetaAdInsights } = await import('@/lib/services/meta-service')

    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 7)

    const result = await fetchMetaAdInsights(brandId, startDate, endDate, false, false)

    if (result.success) {
      console.log(`[QStash Worker] ✅ Recent sync complete: ${result.count || 0} records`)
      return NextResponse.json({
        success: true,
        records: result.count || 0,
      })
    } else {
      console.error(`[QStash Worker] ❌ Recent sync failed:`, result.error)
      return NextResponse.json({ error: 'Recent sync failed', details: result.error }, { status: 500 })
    }
  } catch (error) {
    console.error(`[QStash Worker] ❌ Recent sync exception:`, error)
    return NextResponse.json(
      { error: 'Recent sync exception', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Export with QStash signature verification (only in production)
export const POST =
  process.env.NODE_ENV === 'production'
    ? verifySignatureAppRouter(handler)
    : handler

