import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    // 1. Check database records
    const { data: records, error: recordsError } = await supabaseAdmin
      .from('meta_ad_daily_insights')
      .select('date, spent')
      .eq('brand_id', '1a30f34b-b048-4f80-b880-6c61bd12c720')
      .order('date', { ascending: false })

    // 2. Check connection status
    const { data: connection, error: connError } = await supabaseAdmin
      .from('platform_connections')
      .select('id, sync_status, created_at, metadata')
      .eq('brand_id', '1a30f34b-b048-4f80-b880-6c61bd12c720')
      .eq('platform_type', 'meta')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // 3. Try to queue a new job
    let queueResult = null
    try {
      if (connection) {
        const { MetaQueueService } = await import('@/lib/services/metaQueueService')
        
        await MetaQueueService.addJob('historical_campaigns', {
          connectionId: connection.id,
          brandId: '1a30f34b-b048-4f80-b880-6c61bd12c720',
          accessToken: connection.access_token,
          accountId: JSON.parse(connection.metadata || '{}').accountId,
          timeRange: {
            since: '2024-09-12',
            until: '2025-09-12'
          },
          priority: 'high',
          description: 'Debug 12-month sync',
          jobType: 'historical_campaigns' as any
        })
        queueResult = 'Job queued successfully'
      }
    } catch (queueError) {
      queueResult = `Queue error: ${queueError instanceof Error ? queueError.message : queueError}`
    }

    return NextResponse.json({
      records: {
        count: records?.length || 0,
        latest: records?.[0],
        earliest: records?.[records?.length - 1],
        totalSpend: records?.reduce((sum, r) => sum + parseFloat(r.spent || '0'), 0) || 0
      },
      connection: {
        id: connection?.id,
        status: connection?.sync_status,
        created: connection?.created_at,
        metadata: connection?.metadata
      },
      queueResult,
      errors: {
        recordsError: recordsError?.message,
        connError: connError?.message
      }
    })

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
