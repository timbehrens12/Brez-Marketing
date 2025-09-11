import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { MetaQueueService } from '@/lib/services/metaQueueService'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const brandId = searchParams.get('brandId')

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID required' }, { status: 400 })
    }

    console.log(`[Meta Sync Status] Getting sync status for brand ${brandId}`)

    // Get sync status from queue service
    const syncStatus = await MetaQueueService.getSyncStatus(brandId)
    
    // Get connection info
    const supabase = createClient()
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('id, status, sync_status, last_sync_at, created_at, updated_at')
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')
      .single()

    console.log(`[Meta Sync Status] Connection lookup result:`, {
      found: !!connection,
      error: connectionError?.message,
      status: connection?.status,
      sync_status: connection?.sync_status
    })

    // Calculate overall status
    let overallStatus = 'not_connected'
    let progressPct = 0
    let estimatedCompletion = null

    if (connection && !connectionError) {
      console.log(`[Meta Sync Status] Connection found:`, {
        id: connection.id || 'unknown',
        status: connection.status,
        sync_status: connection.sync_status,
        created_at: connection.created_at,
        updated_at: connection.updated_at
      })

      // Check if connection is active (has a valid status)
      console.log(`[Meta Sync Status] Evaluating connection status: ${connection.status}, sync_status: ${connection.sync_status}`)

      if (connection.status === 'active' || connection.status === 'connected') {
        if (connection.sync_status === 'in_progress') {
          overallStatus = 'syncing'
          console.log(`[Meta Sync Status] Status set to 'syncing' - connection is active and in progress`)

          // Calculate progress from ETL jobs
          const milestones = syncStatus.meta?.milestones || []
          if (milestones.length > 0) {
            const totalProgress = milestones.reduce((sum: number, milestone: any) =>
              sum + (milestone.progress_pct || 0), 0)
            progressPct = Math.round(totalProgress / milestones.length)

            // Estimate completion based on progress and time elapsed
            const startTime = new Date(connection.created_at).getTime()
            const elapsed = Date.now() - startTime
            const remaining = elapsed * ((100 - progressPct) / Math.max(progressPct, 1))
            estimatedCompletion = new Date(Date.now() + remaining).toISOString()
          }
        } else if (connection.sync_status === 'completed') {
          overallStatus = 'completed'
          progressPct = 100
          console.log(`[Meta Sync Status] Status set to 'completed'`)
        } else if (connection.sync_status === 'failed') {
          overallStatus = 'failed'
          console.log(`[Meta Sync Status] Status set to 'failed'`)
        } else {
          // Connection exists but sync hasn't started yet - check if we have recent data
          console.log(`[Meta Sync Status] Checking for recent data to determine status...`)

          // Check if we have recent Meta data (last 7 days) to determine if sync is actually complete
          const { data: recentData } = await supabase
            .from('meta_ad_daily_insights')
            .select('id')
            .eq('brand_id', brandId)
            .gte('date_range_start', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
            .limit(1)

          if (recentData && recentData.length > 0) {
            overallStatus = 'completed'
            progressPct = 100
            console.log(`[Meta Sync Status] Status set to 'completed' - found recent data`)
          } else {
            overallStatus = 'connected'
            progressPct = 0
            console.log(`[Meta Sync Status] Status set to 'connected' - active connection with no recent data`)
          }
        }
      } else if (connection.status === 'inactive' || connection.status === 'disconnected') {
        overallStatus = 'disconnected'
        console.log(`[Meta Sync Status] Status set to 'disconnected'`)
      } else {
        // Connection has some other status
        overallStatus = 'connected'
        console.log(`[Meta Sync Status] Status set to 'connected' - connection has status: ${connection.status}`)
      }
    } else {
      console.log(`[Meta Sync Status] No connection found or error:`, connectionError?.message)
    }

    const response = {
      brandId,
      overallStatus,
      progressPct,
      estimatedCompletion,
      connection: {
        status: connection?.sync_status || 'not_found',
        lastSynced: connection?.last_sync_at,
        createdAt: connection?.created_at
      },
      milestones: syncStatus.meta?.milestones || [],
      lastUpdate: syncStatus.meta?.last_update || new Date().toISOString()
    }

    console.log(`[Meta Sync Status] Status for brand ${brandId}:`, {
      overallStatus,
      progressPct,
      milestonesCount: response.milestones.length
    })

    return NextResponse.json(response)
  } catch (error) {
    console.error('[Meta Sync Status] Error:', error)
    return NextResponse.json({ 
      error: 'Failed to get sync status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { brandId, action } = await request.json()

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID required' }, { status: 400 })
    }

    const supabase = createClient()

    if (action === 'retry') {
      // Get connection details
      const { data: connection } = await supabase
        .from('platform_connections')
        .select('id, access_token')
        .eq('brand_id', brandId)
        .eq('platform_type', 'meta')
        .single()

      if (!connection) {
        return NextResponse.json({ error: 'Meta connection not found' }, { status: 404 })
      }

      // Reset sync status and retry
      await supabase
        .from('platform_connections')
        .update({ sync_status: 'in_progress' })
        .eq('id', connection.id)

      // Get account ID and queue historical sync
      try {
        const meResponse = await fetch(`https://graph.facebook.com/v18.0/me/adaccounts?access_token=${connection.access_token}&fields=id,name,account_status`)
        const meData = await meResponse.json()
        const accountId = meData.data?.[0]?.id || ''

        const result = await MetaQueueService.queueCompleteHistoricalSync(
          brandId,
          connection.id,
          connection.access_token,
          accountId
        )

        return NextResponse.json({
          success: true,
          message: `Retry queued successfully - ${result.totalJobs} jobs, estimated completion: ${result.estimatedCompletion}`
        })
      } catch (error) {
        console.error('[Meta Sync Status] Retry failed:', error)
        return NextResponse.json({ error: 'Failed to retry sync' }, { status: 500 })
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('[Meta Sync Status] POST Error:', error)
    return NextResponse.json({ 
      error: 'Failed to process action',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
