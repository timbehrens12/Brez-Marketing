import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * COMPREHENSIVE Meta Debug Endpoint
 * Provides detailed information about Meta connections, data, and sync status
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[Meta Debug] 🔍 Starting comprehensive Meta system analysis...')
    
    const supabase = createClient()
    const searchParams = request.nextUrl.searchParams
    const brandId = searchParams.get('brandId')

    const debugInfo: any = {
      timestamp: new Date().toISOString(),
      brandFilter: brandId || 'ALL_BRANDS'
    }

    // 1. Check Meta platform connections
    console.log('[Meta Debug] 📊 Checking Meta platform connections...')
    
    let connectionQuery = supabase
      .from('platform_connections')
      .select('id, brand_id, status, sync_status, platform_type, access_token, created_at, updated_at, last_synced_at, metadata')
      .eq('platform_type', 'meta')

    if (brandId) {
      connectionQuery = connectionQuery.eq('brand_id', brandId)
    }

    const { data: connections, error: connectionsError } = await connectionQuery

    debugInfo.connections = {
      count: connections?.length || 0,
      error: connectionsError?.message,
      details: connections?.map(conn => ({
        id: conn.id,
        brand_id: conn.brand_id,
        status: conn.status,
        sync_status: conn.sync_status,
        has_access_token: !!conn.access_token,
        token_length: conn.access_token?.length || 0,
        created_at: conn.created_at,
        updated_at: conn.updated_at,
        last_synced_at: conn.last_synced_at,
        metadata: conn.metadata
      }))
    }

    // 2. Check Meta data across all tables
    console.log('[Meta Debug] 📊 Checking Meta data across all tables...')
    
    const metaTables = [
      'meta_ad_insights',
      'meta_demographics', 
      'meta_device_performance',
      'meta_campaigns',
      'meta_campaign_daily_stats'
    ]

    debugInfo.dataAnalysis = {}

    for (const table of metaTables) {
      try {
        let dataQuery = supabase
          .from(table)
          .select('brand_id, connection_id, created_at, updated_at', { count: 'exact' })

        if (brandId) {
          dataQuery = dataQuery.eq('brand_id', brandId)
        }

        const { count, data, error } = await dataQuery.limit(5)

        // Get unique brands for this table
        const { data: uniqueBrands } = await supabase
          .from(table)
          .select('brand_id')
          .limit(1000)

        const brandSet = new Set(uniqueBrands?.map(row => row.brand_id) || [])

        debugInfo.dataAnalysis[table] = {
          total_records: count || 0,
          error: error?.message,
          unique_brands: Array.from(brandSet),
          unique_brand_count: brandSet.size,
          sample_records: data?.slice(0, 3),
          latest_record: data?.[0]
        }

      } catch (err) {
        debugInfo.dataAnalysis[table] = {
          error: `Table query failed: ${err instanceof Error ? err.message : String(err)}`
        }
      }
    }

    // 3. Check Meta queue status
    console.log('[Meta Debug] 🔄 Checking Meta queue status...')
    
    try {
      const { metaQueue } = await import('@/lib/services/metaQueueService')
      
      const waitingJobs = await metaQueue.getJobs(['waiting'], 0, 50)
      const activeJobs = await metaQueue.getJobs(['active'], 0, 50)
      const failedJobs = await metaQueue.getJobs(['failed'], 0, 50)
      const delayedJobs = await metaQueue.getJobs(['delayed'], 0, 50)

      debugInfo.queueStatus = {
        waiting: waitingJobs.length,
        active: activeJobs.length,
        failed: failedJobs.length,
        delayed: delayedJobs.length,
        waitingJobDetails: waitingJobs.slice(0, 5).map(job => ({
          id: job.id,
          name: job.name,
          brandId: job.data?.brandId,
          connectionId: job.data?.connectionId,
          created: job.timestamp,
          attempts: job.attemptsMade
        })),
        failedJobDetails: failedJobs.slice(0, 5).map(job => ({
          id: job.id,
          name: job.name,
          brandId: job.data?.brandId,
          error: job.failedReason,
          attempts: job.attemptsMade
        }))
      }

    } catch (queueError) {
      debugInfo.queueStatus = {
        error: `Queue connection failed: ${queueError instanceof Error ? queueError.message : String(queueError)}`
      }
    }

    // 4. Check ETL job tracking
    console.log('[Meta Debug] 📋 Checking ETL job tracking...')
    
    try {
      let etlQuery = supabase
        .from('etl_job')
        .select('*')
        .like('job_type', 'meta_%')
        .order('created_at', { ascending: false })

      if (brandId) {
        etlQuery = etlQuery.eq('brand_id', brandId)
      }

      const { data: etlJobs, error: etlError } = await etlQuery.limit(10)

      debugInfo.etlJobs = {
        count: etlJobs?.length || 0,
        error: etlError?.message,
        recent_jobs: etlJobs?.map(job => ({
          id: job.id,
          brand_id: job.brand_id,
          job_type: job.job_type,
          status: job.status,
          created_at: job.created_at,
          updated_at: job.updated_at,
          error_message: job.error_message
        }))
      }

    } catch (etlError) {
      debugInfo.etlJobs = {
        error: `ETL query failed: ${etlError instanceof Error ? etlError.message : String(etlError)}`
      }
    }

    // 5. Check environment and configuration
    console.log('[Meta Debug] ⚙️ Checking configuration...')
    
    debugInfo.environment = {
      has_meta_app_id: !!process.env.NEXT_PUBLIC_META_APP_ID,
      has_meta_app_secret: !!process.env.META_APP_SECRET,
      has_redis_url: !!process.env.REDIS_URL,
      app_url: process.env.NEXT_PUBLIC_APP_URL,
      deployment_environment: process.env.VERCEL_ENV || 'local'
    }

    // 6. Summary and recommendations
    debugInfo.summary = {
      total_meta_connections: debugInfo.connections.count,
      total_data_records: Object.values(debugInfo.dataAnalysis).reduce((sum: number, table: any) => sum + (table.total_records || 0), 0),
      queue_health: debugInfo.queueStatus.error ? 'ERROR' : 'OK',
      recommendations: []
    }

    if (debugInfo.connections.count === 0) {
      debugInfo.summary.recommendations.push('❌ No Meta connections found - Connect Meta first')
    }

    if (debugInfo.summary.total_data_records === 0) {
      debugInfo.summary.recommendations.push('📭 No Meta data found - Sync may not have run')
    }

    if (debugInfo.queueStatus.failed > 0) {
      debugInfo.summary.recommendations.push(`⚠️ ${debugInfo.queueStatus.failed} failed queue jobs need attention`)
    }

    if (debugInfo.queueStatus.waiting > 0) {
      debugInfo.summary.recommendations.push(`🔄 ${debugInfo.queueStatus.waiting} jobs waiting to process`)
    }

    console.log('[Meta Debug] ✅ Analysis complete')
    console.log('[Meta Debug] 📊 Summary:', debugInfo.summary)

    return NextResponse.json(debugInfo, { status: 200 })

  } catch (error) {
    console.error('[Meta Debug] 💥 Error during analysis:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
