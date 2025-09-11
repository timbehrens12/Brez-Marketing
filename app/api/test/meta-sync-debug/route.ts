import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    console.log('[Meta Sync Debug] Starting comprehensive debug')

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    // 1. Check environment variables
    const envCheck = {
      META_APP_ID: !!process.env.META_APP_ID,
      META_APP_SECRET: !!process.env.META_APP_SECRET,
      META_CONFIG_ID: !!process.env.META_CONFIG_ID,
      REDIS_URL: !!process.env.REDIS_URL,
      REDIS_HOST: !!process.env.REDIS_HOST,
      REDIS_PORT: !!process.env.REDIS_PORT,
      REDIS_PASSWORD: !!process.env.REDIS_PASSWORD,
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      actual_meta_app_id: process.env.META_APP_ID ? process.env.META_APP_ID.substring(0, 10) + '...' : null,
      actual_meta_config_id: process.env.META_CONFIG_ID ? process.env.META_CONFIG_ID.substring(0, 10) + '...' : null,
      redis_host: process.env.REDIS_HOST || null,
      redis_port: process.env.REDIS_PORT || null,
      redis_url_start: process.env.REDIS_URL ? process.env.REDIS_URL.substring(0, 15) + '...' : null
    }

    // 2. Check platform connections
    const { data: connections, error: connError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('platform_type', 'meta')
      .order('created_at', { ascending: false })
      .limit(5)

    // 3. Check ETL jobs
    const { data: etlJobs, error: etlError } = await supabase
      .from('etl_job')
      .select('*')
      .in('job_type', ['recent_sync', 'historical_campaigns', 'historical_demographics', 'historical_insights'])
      .order('created_at', { ascending: false })
      .limit(20)

    // 4. Check Meta data tables
    const tables = [
      'meta_ad_insights',
      'meta_demographics',
      'meta_device_performance',
      'meta_campaigns',
      'meta_ad_daily_insights',
      'meta_adset_daily_insights',
      'meta_ads',
      'meta_adsets',
      'meta_sync_history'
    ]

    const tableCounts = {}
    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })

        tableCounts[table] = {
          count: count || 0,
          error: error?.message || null
        }
      } catch (err) {
        tableCounts[table] = {
          count: 0,
          error: err.message
        }
      }
    }

    // 5. Check Redis/Queue status (try to import)
    let queueStatus = { error: null, waiting: 0, active: 0 }
    try {
      const { metaQueue } = await import('@/lib/services/metaQueueService')
      const waiting = await metaQueue.getWaiting()
      const active = await metaQueue.getActive()
      queueStatus = {
        error: null,
        waiting: waiting.length,
        active: active.length,
        queueJobs: waiting.slice(0, 5).map(job => ({
          id: job.id,
          name: job.name,
          data: job.data,
          created: new Date(job.timestamp).toISOString()
        }))
      }
    } catch (queueError) {
      queueStatus.error = queueError.message
    }

    // 6. Check sync status endpoint
    let syncStatus = { error: null, data: null }
    try {
      const syncResponse = await fetch(`https://www.brezmarketingdashboard.com/api/meta/sync-status?brandId=1a30f34b-b048-4f80-b880-6c61bd12c720`)
      if (syncResponse.ok) {
        syncStatus.data = await syncResponse.json()
      } else {
        syncStatus.error = `HTTP ${syncResponse.status}: ${syncResponse.statusText}`
      }
    } catch (syncError) {
      syncStatus.error = syncError.message
    }

    // 7. Test Meta API connectivity
    let metaApiTest = { error: null, data: null }
    try {
      // Try to get user info from Meta API
      const testResponse = await fetch(`https://graph.facebook.com/v18.0/me?access_token=${process.env.META_APP_SECRET}`)
      if (testResponse.ok) {
        const testData = await testResponse.json()
        metaApiTest.data = {
          status: testResponse.status,
          userId: testData.id,
          name: testData.name
        }
      } else {
        metaApiTest.error = `HTTP ${testResponse.status}: ${testResponse.statusText}`
      }
    } catch (metaError) {
      metaApiTest.error = metaError.message
    }

    const debugResult = {
      timestamp: new Date().toISOString(),
      environment: envCheck,
      connections: {
        count: connections?.length || 0,
        error: connError?.message || null,
        recent: connections?.map(conn => ({
          id: conn.id,
          brand_id: conn.brand_id,
          status: conn.sync_status,
          created_at: conn.created_at,
          last_sync_at: conn.last_sync_at,
          has_token: !!conn.access_token
        })) || []
      },
      etlJobs: {
        count: etlJobs?.length || 0,
        error: etlError?.message || null,
        recent: etlJobs?.slice(0, 10).map(job => ({
          id: job.id,
          brand_id: job.brand_id,
          entity: job.entity,
          job_type: job.job_type,
          status: job.status,
          progress_pct: job.progress_pct,
          created_at: job.created_at,
          updated_at: job.updated_at,
          error_message: job.error_message
        })) || []
      },
      dataTables: tableCounts,
      queueStatus,
      syncStatus,
      metaApiTest,
      recommendations: []
    }

    // Generate recommendations
    if (!envCheck.META_APP_ID) {
      debugResult.recommendations.push('❌ META_APP_ID environment variable is missing')
    }
    if (!envCheck.REDIS_URL) {
      debugResult.recommendations.push('❌ REDIS_URL environment variable is missing - queue cannot work')
    }
    if (debugResult.connections.count === 0) {
      debugResult.recommendations.push('ℹ️ No Meta connections found - connect Meta first')
    }
    if (queueStatus.error) {
      debugResult.recommendations.push(`❌ Queue error: ${queueStatus.error}`)
    }
    if (syncStatus.error) {
      debugResult.recommendations.push(`❌ Sync status error: ${syncStatus.error}`)
    }
    if (metaApiTest.error) {
      debugResult.recommendations.push(`❌ Meta API error: ${metaApiTest.error}`)
    }

    console.log('[Meta Sync Debug] Debug completed successfully')

    return NextResponse.json(debugResult)

  } catch (error) {
    console.error('[Meta Sync Debug] Fatal error:', error)
    return NextResponse.json(
      {
        error: 'Debug failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
