import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

/**
 * TEST ENDPOINT: Manually trigger the background sync to debug issues
 */
export async function POST(request: NextRequest) {
  try {
    // 🚨 SIMPLIFIED: Check if this is a server-to-server call (no cookies/session)
    const userAgent = request.headers.get('User-Agent') || ''
    const isServerCall = userAgent.includes('node') || request.headers.get('X-Vercel-ID')
    
    console.log(`[Test Background Sync] 🔍 AUTH DEBUG:`)
    console.log(`[Test Background Sync] - User-Agent: ${userAgent}`)
    console.log(`[Test Background Sync] - X-Vercel-ID: ${request.headers.get('X-Vercel-ID') ? 'PRESENT' : 'MISSING'}`)
    console.log(`[Test Background Sync] - isServerCall: ${isServerCall}`)
    
    let userId = null
    if (!isServerCall) {
      console.log(`[Test Background Sync] - Not server call, checking user auth...`)
      const authResult = await auth()
      userId = authResult.userId
      if (!userId) {
        console.log(`[Test Background Sync] - No user ID found, returning 401`)
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    } else {
      console.log(`[Test Background Sync] - Server call detected, proceeding without user auth`)
    }

    const { brandId } = await request.json()
    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID required' }, { status: 400 })
    }

    console.log(`[Test Background Sync] Starting ${isServerCall ? 'SERVER' : 'USER'} sync for brand ${brandId}`)

    const supabase = createClient()

    // Get Meta connection
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')
      .single()

    if (connectionError || !connection?.access_token) {
      return NextResponse.json({ 
        error: 'Meta connection not found or invalid',
        details: connectionError?.message 
      }, { status: 400 })
    }

    console.log(`[Test Background Sync] Found connection:`, {
      id: connection.id,
      hasToken: !!connection.access_token,
      metadata: connection.metadata
    })

    const adAccountId = connection.metadata?.ad_account_id
    if (!adAccountId) {
      return NextResponse.json({ 
        error: 'Ad account ID not found in metadata',
        metadata: connection.metadata 
      }, { status: 400 })
    }

    console.log(`[Test Background Sync] Using ad account: ${adAccountId}`)

    // Import the proven Meta service method
    const { fetchMetaAdInsights } = await import('@/lib/services/meta-service')

    // 🚀 PRODUCTION REQUIREMENT: Full 12-month background queue sync
    console.log(`[Test Background Sync] 🎯 TRIGGERING FULL 12-MONTH QUEUE SYNC FOR PRODUCTION`)
    
    // 🚀 USE EXISTING META QUEUE SERVICE (proven working setup)
    const { metaQueue } = await import('@/lib/services/metaQueueService')
    
    console.log(`[Test Background Sync] 🔧 Using existing metaQueue service for 12-month sync`)
    
    // Generate 12 monthly jobs for full historical sync
    const now = new Date()
    const jobs = []
    
    for (let i = 11; i >= 0; i--) { // 12 months back to current
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
      
      const jobData = {
        brandId,
        adAccountId,
        month: monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        startDate: monthStart.toISOString(),
        endDate: monthEnd.toISOString(),
        chunkNumber: 12 - i,
        totalChunks: 12
      }
      
      // Add job to queue with delay to prevent rate limiting
      const job = await metaQueue.add(
        `sync-month-${12-i}`,
        jobData,
        {
          delay: i * 10000, // 10 second delay between jobs
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        }
      )
      
      jobs.push(job.id)
      console.log(`[Test Background Sync] ✅ Queued ${jobData.month} (Job ${job.id})`)
    }
    
    // Also queue budget + adsets + ads creative sync job
    const budgetJob = await metaQueue.add(
      'sync-budgets',
      {
        brandId,
        adAccountId,
        type: 'budget_sync'
      },
      {
        delay: 2000, // Start budget sync after 2 seconds
        attempts: 3
      }
    )
    
    // Queue ads creative sync job (images, headlines, CTAs)
    const creativeJob = await metaQueue.add(
      'sync-creative',
      {
        brandId,
        adAccountId,
        type: 'creative_sync'
      },
      {
        delay: 5000, // Start creative sync after 5 seconds
        attempts: 3
      }
    )
    
    console.log(`[Test Background Sync] ✅ Queued budget sync (Job ${budgetJob.id})`)
    console.log(`[Test Background Sync] ✅ Queued creative sync (Job ${creativeJob.id})`)
    
    // 🚀 START QUEUE PROCESSOR: Trigger the worker to process all jobs
    console.log(`[Test Background Sync] 🚀 Starting queue processor...`)
    
    try {
      const processorResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://www.brezmarketingdashboard.com'}/api/meta/process-full-sync-queue`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'User-Agent': 'node', // Mark as server call
        },
        body: JSON.stringify({ trigger: 'start_processing' })
      })
      
      const processorResult = await processorResponse.json()
      console.log(`[Test Background Sync] ✅ Queue processor started:`, processorResult)
    } catch (processorError) {
      console.warn(`[Test Background Sync] ⚠️ Failed to start queue processor (jobs will still process):`, processorError)
    }
    
    // Return immediate success - jobs will process in background
    const insightsResult = {
      success: true,
      message: `Queued 12-month historical sync + budget + creative sync`,
      count: jobs.length + 2, // 12 months + 1 budget + 1 creative job
      jobsQueued: jobs.concat([budgetJob.id, creativeJob.id]),
      type: 'background_queue'
    }

    console.log(`[Test Background Sync] Result:`, insightsResult)

    if (insightsResult.success) {
      return NextResponse.json({
        success: true,
        message: 'Full 12-month background sync queued successfully',
        result: insightsResult,
        syncPeriod: {
          from: new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString().split('T')[0], // 12 months ago
          to: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0] // End of current month
        },
        queueInfo: {
          totalJobs: jobs.length + 2,
          monthlyJobs: jobs.length,
          budgetJobs: 1,
          creativeJobs: 1,
          estimatedCompletion: '15-20 minutes'
        }
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Background queue sync failed',
        details: insightsResult.message || 'Unknown error',
        syncPeriod: {
          from: new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString().split('T')[0],
          to: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
        }
      }, { status: 500 })
    }

  } catch (error) {
    console.error('[Test Background Sync] Error:', error)
    return NextResponse.json({
      error: 'Test background sync failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
