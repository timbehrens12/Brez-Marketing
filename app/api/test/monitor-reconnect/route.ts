import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Real-time monitoring of Shopify reconnection
 * GET /api/test/monitor-reconnect?brandId=1a30f34b-b048-4f80-b880-6c61bd12c720
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const brandId = searchParams.get('brandId')

    if (!brandId) {
      return NextResponse.json({ error: 'brandId parameter required' }, { status: 400 })
    }

    const supabase = createClient()

    // Get current connection status
    const { data: connections, error: connError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('brand_id', brandId)
      .eq('platform_type', 'shopify')
      .order('created_at', { ascending: false })

    // Get recent ETL jobs
    const { data: jobs, error: jobsError } = await supabase
      .from('etl_job')
      .select('*')
      .eq('brand_id', brandId)
      .order('created_at', { ascending: false })
      .limit(20)

    // Analyze current state
    const activeConnection = connections?.find(c => c.status === 'active')
    const recentJobs = jobs?.filter(j =>
      new Date(j.created_at) > new Date(Date.now() - 10 * 60 * 1000) // Last 10 minutes
    ) || []

    const analysis = {
      timestamp: new Date().toISOString(),
      connection_status: {
        has_active_connection: !!activeConnection,
        connection_count: connections?.length || 0,
        active_connection_id: activeConnection?.id,
        sync_status: activeConnection?.sync_status,
        last_updated: activeConnection?.updated_at
      },
      etl_jobs_status: {
        total_recent_jobs: recentJobs.length,
        jobs_by_status: {
          running: recentJobs.filter(j => j.status === 'running').length,
          completed: recentJobs.filter(j => j.status === 'completed').length,
          failed: recentJobs.filter(j => j.status === 'failed').length,
          queued: recentJobs.filter(j => j.status === 'queued').length
        },
        jobs_by_entity: {
          orders: recentJobs.filter(j => j.entity === 'orders').length,
          customers: recentJobs.filter(j => j.entity === 'customers').length,
          products: recentJobs.filter(j => j.entity === 'products').length,
          recent_sync: recentJobs.filter(j => j.entity === 'recent_sync').length
        },
        bulk_operations_count: recentJobs.filter(j => j.shopify_bulk_id).length
      },
      health_check: {
        is_healthy: !!activeConnection && recentJobs.length > 0,
        has_running_jobs: recentJobs.some(j => j.status === 'running'),
        has_bulk_operations: recentJobs.some(j => j.shopify_bulk_id),
        last_job_timestamp: recentJobs[0]?.created_at || null
      },
      recommendations: []
    }

    // Generate recommendations based on current state
    if (!activeConnection) {
      analysis.recommendations.push('❌ No active Shopify connection found')
      analysis.recommendations.push('✅ Reconnect your Shopify store')
    } else if (activeConnection.sync_status === 'pending') {
      analysis.recommendations.push('⏳ Connection is pending - sync should start soon')
    } else if (activeConnection.sync_status === 'syncing') {
      analysis.recommendations.push('🔄 Sync is in progress - this is good!')
    } else if (activeConnection.sync_status === 'completed') {
      analysis.recommendations.push('✅ Sync appears completed')
    }

    if (recentJobs.length === 0) {
      analysis.recommendations.push('⚠️ No recent ETL jobs found')
      analysis.recommendations.push('✅ Try reconnecting to trigger sync')
    } else if (recentJobs.some(j => j.status === 'running')) {
      analysis.recommendations.push('✅ Jobs are running - sync is active')
    }

    if (!recentJobs.some(j => j.shopify_bulk_id)) {
      analysis.recommendations.push('⚠️ No bulk operations detected')
    }

    return NextResponse.json({
      success: true,
      message: '🔍 SHOPIFY RECONNECTION MONITORING REPORT',
      monitoring_report: analysis,
      quick_check: {
        status: analysis.health_check.is_healthy ? 'HEALTHY' : 'NEEDS_ATTENTION',
        active_connection: analysis.connection_status.has_active_connection,
        sync_running: analysis.health_check.has_running_jobs,
        bulk_operations: analysis.health_check.has_bulk_operations,
        recent_activity: analysis.etl_jobs_status.total_recent_jobs > 0
      },
      next_steps: [
        '🔄 REFRESH: Run this endpoint again to see progress',
        '📊 STATUS: Check /api/sync/[brandId]/status for detailed progress',
        '📋 LOGS: Monitor server logs for bulk operation updates',
        '⚡ WAIT: Allow 5-10 minutes for bulk operations to complete'
      ]
    })

  } catch (error) {
    console.error('[Monitor Reconnect] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
