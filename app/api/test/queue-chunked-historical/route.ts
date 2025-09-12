import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { MetaQueueService } from '@/lib/services/metaQueueService'

export async function POST(request: NextRequest) {
  try {
    const { brandId } = await request.json()

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID required' }, { status: 400 })
    }

    console.log(`[Queue Chunked Historical] Queuing 6-month historical sync in 30-day chunks for brand: ${brandId}`)

    // Get the active Meta connection
    const supabase = createClient()
    const { data: connection, error: connError } = await supabase
      .from('platform_connections')
      .select('id, access_token')
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')
      .eq('status', 'active')
      .single()

    if (connError || !connection) {
      return NextResponse.json({
        error: 'No active Meta connection found',
        details: connError?.message
      }, { status: 404 })
    }

    // Create 30-day chunks from March 1, 2025 to September 12, 2025
    const startDate = new Date('2025-03-01')
    const endDate = new Date('2025-09-12')
    const chunks: Array<{since: string, until: string}> = []

    let currentStart = new Date(startDate)
    while (currentStart < endDate) {
      let currentEnd = new Date(currentStart)
      currentEnd.setDate(currentEnd.getDate() + 30) // 30-day chunks
      
      if (currentEnd > endDate) {
        currentEnd = new Date(endDate)
      }

      chunks.push({
        since: currentStart.toISOString().split('T')[0],
        until: currentEnd.toISOString().split('T')[0]
      })

      currentStart = new Date(currentEnd)
      currentStart.setDate(currentStart.getDate() + 1) // Next day
    }

    console.log(`[Queue Chunked Historical] Created ${chunks.length} chunks:`, chunks)

    // Queue each chunk as a separate job with delays
    const queuedJobs = []
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      
      try {
        await MetaQueueService.addJob('historical_campaigns', {
          connectionId: connection.id,
          brandId: brandId,
          timeRange: chunk,
          priority: 'high',
          description: `Historical chunk ${i + 1}/${chunks.length}: ${chunk.since} to ${chunk.until}`,
          jobType: 'historical_campaigns' as any
        })

        queuedJobs.push(`Chunk ${i + 1}: ${chunk.since} to ${chunk.until}`)
        console.log(`[Queue Chunked Historical] Queued chunk ${i + 1}/${chunks.length}: ${chunk.since} to ${chunk.until}`)

        // Small delay between queuing jobs
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      } catch (chunkError) {
        console.error(`[Queue Chunked Historical] Failed to queue chunk ${i + 1}:`, chunkError)
        queuedJobs.push(`Chunk ${i + 1}: FAILED - ${chunkError instanceof Error ? chunkError.message : 'Unknown error'}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully queued ${chunks.length} historical sync chunks!`,
      connectionId: connection.id,
      totalChunks: chunks.length,
      dateRange: '2025-03-01 to 2025-09-12',
      queuedJobs,
      note: 'Each chunk covers ~30 days to avoid timeouts. Check /api/test/meta-sync-debug for progress'
    })

  } catch (error) {
    console.error('[Queue Chunked Historical] Error:', error)
    return NextResponse.json({
      error: 'Failed to queue chunked historical sync',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return POST(request)
}
