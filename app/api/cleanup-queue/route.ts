import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  console.log('[Queue Cleanup] Starting manual queue cleanup')

  try {
    // Import queue service
    const { metaQueue } = await import('@/lib/services/metaQueueService')

    // Get all waiting and active jobs
    const waiting = await metaQueue.getWaiting()
    const active = await metaQueue.getActive()
    let cleanedCount = 0

    // Check Supabase for valid connections
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = createClient()

    // Get all valid Meta connections
    const { data: validConnections } = await supabase
      .from('platform_connections')
      .select('id')
      .eq('platform_type', 'meta')
      .eq('status', 'active')

    const validConnectionIds = new Set(validConnections?.map(c => c.id) || [])

    console.log(`[Queue Cleanup] Found ${validConnections?.length || 0} valid Meta connections`)
    console.log(`[Queue Cleanup] Checking ${waiting.length} waiting jobs and ${active.length} active jobs`)

    // Clean waiting jobs
    for (const job of waiting) {
      if (job.data?.connectionId && !validConnectionIds.has(job.data.connectionId)) {
        await metaQueue.remove(job.id)
        console.log(`[Queue Cleanup] Removed orphaned waiting job ${job.id} with invalid connection ${job.data.connectionId}`)
        cleanedCount++
      }
    }

    // Clean active jobs
    for (const job of active) {
      if (job.data?.connectionId && !validConnectionIds.has(job.data.connectionId)) {
        await metaQueue.remove(job.id)
        console.log(`[Queue Cleanup] Removed orphaned active job ${job.id} with invalid connection ${job.data.connectionId}`)
        cleanedCount++
      }
    }

    console.log(`[Queue Cleanup] Cleanup completed. Removed ${cleanedCount} orphaned jobs`)

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${cleanedCount} orphaned jobs`,
      cleanedCount,
      validConnections: validConnections?.length || 0,
      jobsChecked: waiting.length + active.length
    })

  } catch (error) {
    console.error('[Queue Cleanup] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Cleanup failed'
    }, { status: 500 })
  }
}
