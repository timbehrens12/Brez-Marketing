import { NextRequest, NextResponse } from 'next/server'

/**
 * Simple queue cleanup - just remove stalled jobs
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[Simple Cleanup] Starting cleanup...')

    // Import queue service dynamically
    const { shopifyQueue } = await import('@/lib/services/shopifyQueueService')
    
    console.log('[Simple Cleanup] Queue imported successfully')
    
    // Simple approach - just clean the problematic job states
    console.log('[Simple Cleanup] Removing active (stalled) jobs...')
    const activeResult = await shopifyQueue.clean(0, 'active')
    
    console.log('[Simple Cleanup] Removing delayed jobs...')
    const delayedResult = await shopifyQueue.clean(0, 'delayed')
    
    console.log('[Simple Cleanup] Removing failed jobs...')  
    const failedResult = await shopifyQueue.clean(0, 'failed')
    
    console.log('[Simple Cleanup] Cleanup completed')
    
    return NextResponse.json({
      success: true,
      message: 'Simple queue cleanup completed',
      removed: {
        active: activeResult,
        delayed: delayedResult,
        failed: failedResult
      }
    })

  } catch (error) {
    console.error('[Simple Cleanup] Error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return POST(request)
}
