import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { MetaQueueService, MetaJobType } from '@/lib/services/metaQueueService'

/**
 * QUEUED NUCLEAR SYNC: Uses existing queue infrastructure to prevent timeouts
 * This triggers background jobs to get all missing data month by month
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const brandId = searchParams.get('brandId')
  
  if (!brandId) {
    return NextResponse.json({ error: 'Brand ID required as query parameter' }, { status: 400 })
  }

  return await nuclearSyncQueued(brandId)
}

export async function POST(request: NextRequest) {
  const { brandId } = await request.json()
  
  if (!brandId) {
    return NextResponse.json({ error: 'Brand ID required in request body' }, { status: 400 })
  }

  return await nuclearSyncQueued(brandId)
}

async function nuclearSyncQueued(brandId: string) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log(`⚡ [Queued Nuclear Sync] Starting background sync for brand ${brandId}`)
    console.log(`⚡ [Queued Nuclear Sync] This uses your existing Upstash queue to prevent timeouts!`)

    const supabase = createClient()

    // 1. Get Meta connection
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

    // 2. Get/set ad account ID
    let adAccountId = connection.metadata?.ad_account_id
    
    if (!adAccountId) {
      console.log(`⚡ [Queued Nuclear Sync] Fetching ad account ID...`)
      
      const accountsUrl = `https://graph.facebook.com/v18.0/me/adaccounts?access_token=${connection.access_token}`
      const accountsResponse = await fetch(accountsUrl)
      const accountsData = await accountsResponse.json()
      
      if (accountsData.error || !accountsData.data?.length) {
        return NextResponse.json({ 
          error: 'Failed to get ad account',
          details: accountsData.error?.message || 'No ad accounts found'
        }, { status: 400 })
      }
      
      adAccountId = accountsData.data[0].id
      
      await supabase
        .from('platform_connections')
        .update({
          metadata: { ad_account_id: adAccountId },
          updated_at: new Date().toISOString()
        })
        .eq('brand_id', brandId)
        .eq('platform_type', 'meta')
        
      console.log(`⚡ [Queued Nuclear Sync] Updated connection with ad account ID: ${adAccountId}`)
    }

    // 3. Mark sync as in progress
    await supabase
      .from('platform_connections')
      .update({
        sync_status: 'in_progress',
        updated_at: new Date().toISOString()
      })
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')

    // 4. Queue individual month jobs using existing infrastructure
    const monthChunks = [
      { name: 'March 2025', start: '2025-03-01', end: '2025-03-31' },
      { name: 'April 2025', start: '2025-04-01', end: '2025-04-30' },
      { name: 'May 2025', start: '2025-05-01', end: '2025-05-31' },
      { name: 'June 2025', start: '2025-06-01', end: '2025-06-30' },
      { name: 'July 2025', start: '2025-07-01', end: '2025-07-31' },
      { name: 'August 2025', start: '2025-08-01', end: '2025-08-31' },
      { name: 'September 2025', start: '2025-09-01', end: '2025-09-22' }
    ]

    console.log(`⚡ [Queued Nuclear Sync] Queueing ${monthChunks.length} month chunks...`)

    let jobsQueued = 0

    for (const [index, chunk] of monthChunks.entries()) {
      try {
        // Use existing MetaQueueService to queue historical insights for each month
        await MetaQueueService.addJob(
          MetaJobType.HISTORICAL_INSIGHTS,
          {
            brandId,
            connectionId: connection.id,
            accessToken: connection.access_token,
            accountId: adAccountId,
            dateFrom: chunk.start,
            dateTo: chunk.end,
            isNuclearSync: true, // Flag to indicate this is part of nuclear sync
            chunkName: chunk.name,
            chunkIndex: index,
            totalChunks: monthChunks.length
          },
          {
            delay: index * 30000, // 30 second delay between jobs to prevent rate limiting
            priority: 1, // High priority
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 10000,
            }
          }
        )

        jobsQueued++
        console.log(`⚡ [Queued Nuclear Sync] Queued job ${index + 1}/${monthChunks.length}: ${chunk.name}`)

      } catch (queueError) {
        console.error(`⚡ [Queued Nuclear Sync] Failed to queue ${chunk.name}:`, queueError)
      }
    }

    // 5. Queue a final aggregation job after all months complete
    try {
      await MetaQueueService.addJob(
        MetaJobType.RECONCILE,
        {
          brandId,
          connectionId: connection.id,
          accessToken: connection.access_token,
          accountId: adAccountId,
          isNuclearSync: true,
          finalAggregation: true
        },
        {
          delay: (monthChunks.length * 30000) + 60000, // Run after all month jobs + 1 minute buffer
          priority: 1,
          attempts: 2
        }
      )

      console.log(`⚡ [Queued Nuclear Sync] Queued final aggregation job`)
      jobsQueued++

    } catch (aggQueueError) {
      console.error(`⚡ [Queued Nuclear Sync] Failed to queue aggregation:`, aggQueueError)
    }

    // 6. Create a monitoring endpoint URL for tracking progress
    const monitorUrl = `${request.url.split('/api')[0]}/api/meta/nuclear-sync-status?brandId=${brandId}`

    return NextResponse.json({
      success: true,
      message: `Nuclear sync queued successfully - processing ${monthChunks.length} months in background`,
      stats: {
        jobsQueued,
        monthsToProcess: monthChunks.length,
        expectedDuration: `${Math.ceil((monthChunks.length * 30) / 60)} minutes`,
        dateRange: { from: '2025-03-01', to: '2025-09-22' },
        queueStatus: 'in_progress'
      },
      monitoring: {
        statusUrl: monitorUrl,
        checkAfter: `${monthChunks.length * 30} seconds`,
        instructions: 'Check the status URL or refresh your dashboard after the expected duration'
      },
      monthlyJobs: monthChunks.map((chunk, index) => ({
        month: chunk.name,
        dateRange: `${chunk.start} to ${chunk.end}`,
        estimatedStart: `${index * 30} seconds from now`,
        status: 'queued'
      })),
      recommendation: `✅ Background sync started! Your existing Upstash queue will process each month separately. Check your dashboard in ~${Math.ceil((monthChunks.length * 30) / 60)} minutes.`
    })

  } catch (error) {
    console.error('⚡ [Queued Nuclear Sync] Critical error:', error)

    // Try to update sync status
    try {
      const supabase = createClient()
      await supabase
        .from('platform_connections')
        .update({
          sync_status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('platform_type', 'meta')
        .eq('sync_status', 'in_progress')
    } catch (updateError) {
      console.error('⚡ [Queued Nuclear Sync] Failed to update sync status:', updateError)
    }

    return NextResponse.json({
      error: 'Queued nuclear sync failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
