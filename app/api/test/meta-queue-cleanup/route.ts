import { NextRequest, NextResponse } from 'next/server'

/**
 * EMERGENCY ENDPOINT - Clean up ALL orphaned Meta queue jobs
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[Meta Queue Cleanup] 🚨 EMERGENCY CLEANUP - Starting removal of ALL orphaned Meta jobs...')

    // Import Meta queue service
    const { metaQueue } = await import('@/lib/services/metaQueueService')
    const { createClient } = await import('@/lib/supabase/server')
    
    // Get all active Meta connections to check against
    const supabase = createClient()
    const { data: activeConnections } = await supabase
      .from('platform_connections')
      .select('id, brand_id')
      .eq('platform_type', 'meta')
      .eq('status', 'active')
    
    const activeConnectionIds = new Set(activeConnections?.map(c => c.id) || [])
    const activeBrandIds = new Set(activeConnections?.map(c => c.brand_id) || [])
    
    console.log(`[Meta Queue Cleanup] 🔍 Found ${activeConnectionIds.size} active Meta connections for ${activeBrandIds.size} brands`)
    console.log(`[Meta Queue Cleanup] 🎯 Active brands: ${Array.from(activeBrandIds).join(', ')}`)
    
    // Get queue stats before cleanup
    const waitingJobs = await metaQueue.getJobs(['waiting'], 0, 500)
    const activeJobs = await metaQueue.getJobs(['active'], 0, 100)
    const failedJobs = await metaQueue.getJobs(['failed'], 0, 500)
    const delayedJobs = await metaQueue.getJobs(['delayed'], 0, 500)
    
    const beforeStats = {
      waiting: waitingJobs.length,
      active: activeJobs.length,
      failed: failedJobs.length,
      delayed: delayedJobs.length
    }
    
    console.log('[Meta Queue Cleanup] 📊 Queue stats BEFORE cleanup:', beforeStats)
    
    // AGGRESSIVE CLEANUP - Remove ALL orphaned jobs
    let orphanedCount = 0
    let totalRemoved = 0
    
    console.log('[Meta Queue Cleanup] 🧹 Cleaning WAITING jobs for orphaned brands...')
    for (const job of waitingJobs) {
      try {
        const brandId = job.data?.brandId
        if (brandId && !activeBrandIds.has(brandId)) {
          console.log(`[Meta Queue Cleanup] ❌ Removing orphaned WAITING job ${job.id} for deleted brand ${brandId}`)
          await job.remove()
          orphanedCount++
        }
        totalRemoved++
      } catch (err) {
        console.warn(`[Meta Queue Cleanup] ⚠️ Error removing waiting job ${job.id}:`, err)
      }
    }

    console.log('[Meta Queue Cleanup] 🧹 Cleaning FAILED jobs for orphaned brands...')
    for (const job of failedJobs) {
      try {
        const brandId = job.data?.brandId
        if (brandId && !activeBrandIds.has(brandId)) {
          console.log(`[Meta Queue Cleanup] ❌ Removing orphaned FAILED job ${job.id} for deleted brand ${brandId}`)
          await job.remove()
          orphanedCount++
        }
        totalRemoved++
      } catch (err) {
        console.warn(`[Meta Queue Cleanup] ⚠️ Error removing failed job ${job.id}:`, err)
      }
    }
    
    console.log('[Meta Queue Cleanup] 🧹 Cleaning ALL stalled/delayed jobs...')
    
    // Clean up ALL stalled jobs aggressively
    await metaQueue.clean(0, 'active') // Remove all active jobs (they're stalled)
    await metaQueue.clean(0, 'delayed') // Remove all delayed jobs
    
    console.log(`[Meta Queue Cleanup] ✅ Manually removed ${orphanedCount} orphaned jobs out of ${totalRemoved} total`)
    
    // Get queue stats after cleanup
    const waitingJobsAfter = await metaQueue.getJobs(['waiting'], 0, 100)
    const activeJobsAfter = await metaQueue.getJobs(['active'], 0, 100)
    const failedJobsAfter = await metaQueue.getJobs(['failed'], 0, 100)
    const delayedJobsAfter = await metaQueue.getJobs(['delayed'], 0, 100)
    
    const afterStats = {
      waiting: waitingJobsAfter.length,
      active: activeJobsAfter.length,
      failed: failedJobsAfter.length,
      delayed: delayedJobsAfter.length
    }
    
    console.log('[Meta Queue Cleanup] 📊 Queue stats AFTER cleanup:', afterStats)
    
    // List remaining jobs for debugging
    if (waitingJobsAfter.length > 0) {
      console.log('[Meta Queue Cleanup] 🔍 Remaining waiting jobs:')
      for (const job of waitingJobsAfter.slice(0, 5)) {
        console.log(`  - Job ${job.id}: ${job.data?.brandId || 'no brand'} (${job.name})`)
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Meta queue emergency cleanup completed',
      before: beforeStats,
      after: afterStats,
      orphanedJobsRemoved: orphanedCount,
      totalJobsProcessed: totalRemoved,
      activeMetaConnections: activeConnectionIds.size,
      activeBrands: Array.from(activeBrandIds)
    })

  } catch (error) {
    console.error('[Meta Queue Cleanup] 💥 Error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return POST(request)
}
