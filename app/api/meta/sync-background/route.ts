import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

/**
 * BACKGROUND META SYNC: Starts the sync and returns immediately
 * Uses the existing queue system to process data sync in background
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { brandId } = await request.json()
    
    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID required' }, { status: 400 })
    }

    console.log(`🚀 [Background Sync] Starting background Meta sync for brand ${brandId}`)

    const supabase = createClient()

    // 1. Validate Meta connection exists
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

    // 2. Mark sync as in progress immediately
    await supabase
      .from('platform_connections')
      .update({
        sync_status: 'in_progress',
        updated_at: new Date().toISOString()
      })
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')

    // 3. Queue background sync jobs for each month
    const months = [
      { name: 'March 2025', start: '2025-03-01', end: '2025-03-31' },
      { name: 'April 2025', start: '2025-04-01', end: '2025-04-30' },
      { name: 'May 2025', start: '2025-05-01', end: '2025-05-31' },
      { name: 'June 2025', start: '2025-06-01', end: '2025-06-30' },
      { name: 'July 2025', start: '2025-07-01', end: '2025-07-31' },
      { name: 'August 2025', start: '2025-08-01', end: '2025-08-31' },
      { name: 'September 2025', start: '2025-09-01', end: '2025-09-22' }
    ]

    // 4. Create background jobs using your existing queue system
    try {
      // Use the existing queue endpoint to process each month
      for (let i = 0; i < months.length; i++) {
        const month = months[i]
        
        // Create a job for each month with delay to prevent rate limiting
        const jobPayload = {
          type: 'meta_sync_month',
          brandId: brandId,
          month: month,
          priority: 'high',
          delay: i * 60000, // 1 minute delay between each month job
          metadata: {
            connectionId: connection.id,
            adAccountId: connection.metadata?.ad_account_id,
            accessToken: connection.access_token,
            monthIndex: i + 1,
            totalMonths: months.length
          }
        }

        // Add to queue (adjust this based on your existing queue system)
        const queueResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/queue/add`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(jobPayload)
        })

        if (!queueResponse.ok) {
          console.error(`Failed to queue ${month.name} sync job`)
        } else {
          console.log(`✅ Queued ${month.name} sync job with ${i * 60} second delay`)
        }
      }

      // 5. Also queue a final aggregation job after all months
      const aggregationJob = {
        type: 'meta_aggregate_data',
        brandId: brandId,
        priority: 'high',
        delay: months.length * 60000 + 120000, // After all months + 2 minutes buffer
        metadata: {
          connectionId: connection.id,
          finalStep: true
        }
      }

      await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/queue/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(aggregationJob)
      })

      console.log(`✅ Queued final aggregation job`)

    } catch (queueError) {
      console.error('Failed to queue background sync jobs:', queueError)
      
      // Fallback: trigger a simple background sync without queue
      await triggerFallbackSync(brandId, connection)
    }

    // 6. Return immediately with job status
    return NextResponse.json({
      success: true,
      message: `Background Meta sync started for brand ${brandId}`,
      status: 'in_progress',
      details: {
        monthsToProcess: months.length,
        estimatedDuration: '10-15 minutes',
        progressTracking: 'Check sync_status in platform_connections table',
        jobsQueued: months.length + 1 // months + aggregation
      },
      instructions: {
        checkProgress: `GET /api/meta/sync-status?brandId=${brandId}`,
        dashboard: 'Refresh your dashboard in 10-15 minutes to see complete data'
      }
    })

  } catch (error) {
    console.error('🚀 [Background Sync] Error starting background sync:', error)
    
    return NextResponse.json({
      error: 'Failed to start background sync',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Fallback sync function for when queue is not available
async function triggerFallbackSync(brandId: string, connection: any) {
  try {
    console.log(`🔄 [Background Sync] Using fallback method for brand ${brandId}`)
    
    // Trigger async sync without waiting for response
    fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/meta/nuclear-sync-chunked`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ brandId }),
    }).catch(error => {
      console.error('Fallback sync failed:', error)
    })
    
    console.log(`🔄 [Background Sync] Fallback sync triggered`)
    
  } catch (error) {
    console.error('Fallback sync trigger failed:', error)
  }
}
