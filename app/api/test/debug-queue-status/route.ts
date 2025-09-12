import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('[Debug Queue] Checking queue status...')

    // Import the queue service
    const { MetaQueueService } = await import('@/lib/services/metaQueueService')

    // Get queue stats
    const stats = await MetaQueueService.getQueueStats()
    
    console.log('[Debug Queue] Queue stats:', stats)

    return NextResponse.json({
      success: true,
      queueStats: stats,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[Debug Queue] Error:', error)
    return NextResponse.json({
      error: 'Failed to get queue status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('[Debug Queue] Manually processing queue...')

    // Import the worker functions
    const { processQueue } = await import('@/lib/workers/metaWorker')

    // Process the queue manually
    const result = await processQueue()
    
    console.log('[Debug Queue] Process result:', result)

    return NextResponse.json({
      success: true,
      processResult: result,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[Debug Queue] Process error:', error)
    return NextResponse.json({
      error: 'Failed to process queue',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
