import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { MetaQueueService } from '@/lib/services/metaQueueService'

export async function POST(request: NextRequest) {
  try {
    const { brandId } = await request.json()

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID required' }, { status: 400 })
    }

    console.log(`[Queue Full Historical] Queuing 6-month historical sync for brand: ${brandId}`)

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

    // Queue the historical sync job through Redis
    const queueResult = await MetaQueueService.addJob('historical_campaigns', {
      connectionId: connection.id,
      brandId: brandId,
      timeRange: {
        since: '2025-03-01',  // 6 months ago
        until: '2025-09-12'   // today
      },
      priority: 'high',
      description: 'Full 6-month historical sync with daily breakdown'
    })

    if (queueResult.success) {
      console.log(`[Queue Full Historical] Successfully queued job ${queueResult.jobId}`)
      
      return NextResponse.json({
        success: true,
        message: 'Successfully queued 6-month historical sync!',
        jobId: queueResult.jobId,
        connectionId: connection.id,
        dateRange: '2025-03-01 to 2025-09-12',
        note: 'Check /api/test/meta-sync-debug for progress'
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Failed to queue historical sync',
        details: queueResult.error
      }, { status: 500 })
    }

  } catch (error) {
    console.error('[Queue Full Historical] Error:', error)
    return NextResponse.json({
      error: 'Failed to queue historical sync',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return POST(request)
}
