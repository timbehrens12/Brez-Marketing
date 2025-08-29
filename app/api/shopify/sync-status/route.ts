import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { auth } from '@clerk/nextjs/server'

/**
 * PRODUCTION-SAFE API: Get Shopify sync status and recent activity
 * This endpoint provides essential sync monitoring without debug-level access
 */
export async function GET(request: NextRequest) {
  const statusId = `status_${Date.now()}`
  
  console.log(`📊 [SYNC-STATUS-${statusId}] ===== SYNC STATUS REQUESTED =====`)
  
  try {
    const { userId } = auth()
    if (!userId) {
      console.log(`❌ [SYNC-STATUS-${statusId}] Unauthorized access attempt`)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const brandId = searchParams.get('brandId')
    
    console.log(`📊 [SYNC-STATUS-${statusId}] Brand ID: ${brandId || 'ALL'}`)
    console.log(`📊 [SYNC-STATUS-${statusId}] User ID: ${userId}`)

    if (!brandId) {
      console.log(`❌ [SYNC-STATUS-${statusId}] Missing brand ID`)
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    const supabase = createClient()

    // Get connection status
    console.log(`💾 [SYNC-STATUS-${statusId}] Fetching connection status...`)
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('id, brand_id, shop, status, sync_status, last_synced_at, metadata, updated_at')
      .eq('platform_type', 'shopify')
      .eq('brand_id', brandId)
      .eq('user_id', userId)
      .single()

    if (connectionError) {
      console.error(`❌ [SYNC-STATUS-${statusId}] Error fetching connection:`, connectionError)
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
    }

    console.log(`✅ [SYNC-STATUS-${statusId}] Connection status: ${connection.sync_status}`)

    // Get recent ETL jobs for this brand
    console.log(`💾 [SYNC-STATUS-${statusId}] Fetching recent ETL jobs...`)
    const { data: etlJobs, error: etlError } = await supabase
      .from('etl_job')
      .select('id, entity, job_type, status, progress_pct, rows_written, total_rows, error_message, started_at, completed_at, updated_at')
      .eq('brand_id', brandId)
      .order('created_at', { ascending: false })
      .limit(20)

    if (etlError) {
      console.error(`❌ [SYNC-STATUS-${statusId}] Error fetching ETL jobs:`, etlError)
    } else {
      console.log(`✅ [SYNC-STATUS-${statusId}] Found ${etlJobs?.length || 0} recent ETL jobs`)
    }

    // Get data counts for this brand
    console.log(`💾 [SYNC-STATUS-${statusId}] Fetching data counts...`)
    
    const [ordersCount, customersCount, productsCount] = await Promise.all([
      supabase
        .from('shopify_orders')
        .select('id', { count: 'exact', head: true })
        .eq('brand_id', brandId),
      supabase
        .from('shopify_customers')
        .select('id', { count: 'exact', head: true })
        .eq('brand_id', brandId),
      supabase
        .from('shopify_products')
        .select('id', { count: 'exact', head: true })
        .eq('brand_id', brandId)
    ])

    const dataCounts = {
      orders: ordersCount.count || 0,
      customers: customersCount.count || 0,
      products: productsCount.count || 0
    }

    console.log(`📊 [SYNC-STATUS-${statusId}] Data counts:`, dataCounts)

    // Compile status report
    const statusReport = {
      status_id: statusId,
      timestamp: new Date().toISOString(),
      brand_id: brandId,
      
      // Connection info
      connection: {
        id: connection.id,
        shop: connection.shop,
        status: connection.status,
        sync_status: connection.sync_status,
        last_synced_at: connection.last_synced_at,
        updated_at: connection.updated_at,
        has_metadata: !!connection.metadata
      },
      
      // Recent sync activity
      recent_etl_jobs: etlJobs?.map(job => ({
        id: job.id,
        entity: job.entity,
        job_type: job.job_type,
        status: job.status,
        progress_pct: job.progress_pct,
        rows_written: job.rows_written,
        total_rows: job.total_rows,
        has_error: !!job.error_message,
        started_at: job.started_at,
        completed_at: job.completed_at,
        updated_at: job.updated_at,
        duration_seconds: job.completed_at && job.started_at ? 
          Math.round((new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()) / 1000) : null
      })) || [],
      
      // Data summary
      data_counts: dataCounts,
      
      // Sync health indicators
      health: {
        is_connected: connection.status === 'active',
        is_syncing: connection.sync_status === 'syncing',
        has_data: dataCounts.orders > 0 || dataCounts.customers > 0 || dataCounts.products > 0,
        recent_activity: etlJobs && etlJobs.length > 0,
        last_sync_age_hours: connection.last_synced_at ? 
          Math.round((Date.now() - new Date(connection.last_synced_at).getTime()) / (1000 * 60 * 60)) : null,
        active_jobs: etlJobs?.filter(j => j.status === 'running' || j.status === 'pending').length || 0,
        failed_jobs: etlJobs?.filter(j => j.status === 'failed').length || 0
      }
    }

    console.log(`🎉 [SYNC-STATUS-${statusId}] Status report compiled successfully`)
    console.log(`📊 [SYNC-STATUS-${statusId}] Health summary:`, statusReport.health)

    return NextResponse.json(statusReport)

  } catch (error) {
    console.error(`❌ [SYNC-STATUS-${statusId}] Error generating status report:`, error)
    return NextResponse.json({
      error: 'Failed to generate status report',
      status_id: statusId,
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
