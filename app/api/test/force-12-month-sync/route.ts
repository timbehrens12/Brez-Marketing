import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    console.log(`[Force 12 Month Sync] Starting manual 12-month sync...`)

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    // Get the current Meta connection
    const { data: connection, error: connError } = await supabaseAdmin
      .from('platform_connections')
      .select('*')
      .eq('brand_id', '1a30f34b-b048-4f80-b880-6c61bd12c720')
      .eq('platform_type', 'meta')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (connError || !connection) {
      return NextResponse.json({
        error: 'No Meta connection found',
        details: connError?.message
      }, { status: 404 })
    }

    console.log(`[Force 12 Month Sync] Found connection:`, connection.id)

    // Queue a new 12-month historical sync job
    const { MetaQueueService } = await import('@/lib/services/metaQueueService')

    await MetaQueueService.addJob('historical_campaigns', {
      connectionId: connection.id,
      brandId: connection.brand_id,
      accessToken: connection.access_token,
      accountId: JSON.parse(connection.metadata || '{}').accountId,
      timeRange: {
        since: '2024-09-12',  // Full 12 months back
        until: '2025-09-12'   // Today  
      },
      priority: 'high',
      description: 'Manual 12-month historical sync with daily breakdown',
      jobType: 'historical_campaigns' as any
    })

    console.log(`[Force 12 Month Sync] ✅ Queued 12-month historical sync job`)

    // Manually trigger the queue processor
    try {
      const response = await fetch('https://www.brezmarketingdashboard.com/api/cron/process-queue', {
        method: 'POST'
      })
      const result = await response.json()
      console.log(`[Force 12 Month Sync] Queue processor result:`, result)
    } catch (procError) {
      console.warn(`[Force 12 Month Sync] Failed to trigger queue processor:`, procError)
    }

    return NextResponse.json({
      success: true,
      message: '12-month sync job queued and processor triggered',
      connectionId: connection.id,
      brandId: connection.brand_id
    })

  } catch (error) {
    console.error('[Force 12 Month Sync] Error:', error)
    return NextResponse.json({
      error: 'Failed to force 12-month sync',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return POST(request)
}
