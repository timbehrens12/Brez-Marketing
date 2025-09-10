import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const brandId = '0da80e8f-2df3-468d-9053-08fa4d24e6e8'
    
    const supabase = createClient()
    
    // Check current Meta connections
    const { data: connections, error: connError } = await supabase
      .from('platform_connections')
      .select('id, platform_type, status, created_at, updated_at')
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')
      .order('created_at', { ascending: false })

    if (connError) {
      return NextResponse.json({ error: connError.message }, { status: 500 })
    }

    // Check current queue jobs
    const { metaQueue } = await import('@/lib/services/metaQueueService')
    const waitingJobs = await metaQueue.getWaiting()
    const failedJobs = await metaQueue.getFailed()
    
    const jobSample = waitingJobs.slice(0, 5).map(job => ({
      id: job.id,
      name: job.name,
      connectionId: job.data?.connectionId,
      brandId: job.data?.brandId,
      attempts: job.attemptsMade
    }))

    const failedSample = failedJobs.slice(0, 5).map(job => ({
      id: job.id,
      name: job.name,
      connectionId: job.data?.connectionId,
      error: job.failedReason,
      attempts: job.attemptsMade
    }))

    return NextResponse.json({
      success: true,
      brandId,
      connections: connections || [],
      queue: {
        waiting: waitingJobs.length,
        failed: failedJobs.length,
        waitingSample: jobSample,
        failedSample
      }
    })
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
