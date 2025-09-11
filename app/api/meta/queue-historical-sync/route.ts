import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { brandId } = await request.json()
    
    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID required' }, { status: 400 })
    }

    console.log(`[Queue Historical Sync] Starting for brand ${brandId}`)

    // Get the Meta connection
    const supabase = createClient()
    const { data: connection, error: connError } = await supabase
      .from('platform_connections')
      .select('id, access_token, metadata')
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')
      .eq('status', 'active')
      .maybeSingle()

    if (connError || !connection) {
      return NextResponse.json({ 
        error: 'No active Meta connection found',
        details: connError?.message 
      }, { status: 404 })
    }

    // Import the Meta queue service
    const { MetaQueueService } = await import('@/lib/services/metaQueueService')
    
    // Set sync status to "syncing"
    await supabase
      .from('platform_connections')
      .update({ 
        metadata: { 
          ...connection.metadata, 
          sync_status: 'syncing',
          sync_started_at: new Date().toISOString()
        }
      })
      .eq('id', connection.id)

    // Clear existing data first
    console.log(`[Queue Historical Sync] Clearing existing Meta data for brand ${brandId}`)
    await supabase
      .from('meta_ad_daily_insights')
      .delete()
      .eq('brand_id', brandId)

    // Queue 12 months of historical sync jobs
    const today = new Date()
    const jobsQueued = []
    
    // Create monthly chunks for the last 12 months
    for (let monthsBack = 12; monthsBack >= 0; monthsBack--) {
      const startDate = new Date(today.getFullYear(), today.getMonth() - monthsBack, 1)
      const endDate = new Date(today.getFullYear(), today.getMonth() - monthsBack + 1, 0)
      
      // Only include dates up to today
      if (endDate <= today) {
        console.log(`[Queue Historical Sync] Queuing job for ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`)
        
        const job = await MetaQueueService.queueHistoricalInsights(
          brandId,
          connection.id,
          startDate,
          endDate
        )
        
        jobsQueued.push({
          jobId: job.id,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          monthName: startDate.toLocaleString('default', { month: 'long', year: 'numeric' })
        })
      }
    }

    console.log(`[Queue Historical Sync] Queued ${jobsQueued.length} jobs for 12-month historical sync`)

    return NextResponse.json({
      success: true,
      brandId,
      connectionId: connection.id,
      jobsQueued: jobsQueued.length,
      jobs: jobsQueued,
      estimatedCompletionMinutes: Math.ceil(jobsQueued.length * 0.5), // Estimate ~30 seconds per job
      message: `Queued ${jobsQueued.length} historical sync jobs. Your Meta data will be available in approximately ${Math.ceil(jobsQueued.length * 0.5)} minutes.`
    })
  } catch (error) {
    console.error(`[Queue Historical Sync] Error:`, error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

// GET endpoint to check sync status
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const brandId = url.searchParams.get('brandId')
    
    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID required' }, { status: 400 })
    }

    const supabase = createClient()
    
    // Get connection status
    const { data: connection } = await supabase
      .from('platform_connections')
      .select('metadata')
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')
      .eq('status', 'active')
      .maybeSingle()

    if (!connection) {
      return NextResponse.json({ 
        status: 'not_connected',
        syncing: false 
      })
    }

    const syncStatus = connection.metadata?.sync_status
    const syncStartedAt = connection.metadata?.sync_started_at

    // Check queue status
    const { metaQueue } = await import('@/lib/services/metaQueueService')
    const waitingJobs = await metaQueue.getWaiting()
    const activeJobs = await metaQueue.getActive()
    const brandJobs = [...waitingJobs, ...activeJobs].filter(job => 
      job.data?.brandId === brandId
    )

    // Check how much data we have
    const { data: dataCheck } = await supabase
      .from('meta_ad_daily_insights')
      .select('COUNT(*), SUM(spent)')
      .eq('brand_id', brandId)
      .single()

    const isCompleted = syncStatus === 'syncing' && brandJobs.length === 0 && (dataCheck?.count || 0) > 0

    // If sync completed, update status
    if (isCompleted) {
      await supabase
        .from('platform_connections')
        .update({ 
          metadata: { 
            ...connection.metadata, 
            sync_status: 'completed',
            sync_completed_at: new Date().toISOString()
          }
        })
        .eq('brand_id', brandId)
        .eq('platform_type', 'meta')
    }

    return NextResponse.json({
      status: isCompleted ? 'completed' : syncStatus || 'unknown',
      syncing: syncStatus === 'syncing' && !isCompleted,
      syncStartedAt,
      queuedJobs: brandJobs.length,
      totalRecords: dataCheck?.count || 0,
      totalSpent: dataCheck?.sum || 0,
      estimatedTimeRemaining: brandJobs.length * 0.5 // minutes
    })
  } catch (error) {
    console.error(`[Queue Historical Sync Status] Error:`, error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
