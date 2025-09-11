import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { MetaQueueService } from '@/lib/services/metaQueueService'

export async function POST(request: NextRequest) {
  try {
    console.log('[Manual Meta Sync] Starting manual historical sync...')

    const { brandId } = await request.json()

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID required' }, { status: 400 })
    }

    // Get the active Meta connection
    const supabase = createClient()
    const { data: connection, error: connError } = await supabase
      .from('platform_connections')
      .select('id, access_token')
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')
      .eq('status', 'active')
      .single()

    if (connError || !connection) {
      console.error('[Manual Meta Sync] No active Meta connection found:', connError)
      return NextResponse.json({
        error: 'No active Meta connection found',
        details: connError?.message
      }, { status: 404 })
    }

    console.log(`[Manual Meta Sync] Found active connection: ${connection.id}`)

    // Get account ID
    let accountId = ''
    try {
      const meResponse = await fetch(`https://graph.facebook.com/v18.0/me/adaccounts?access_token=${connection.access_token}&fields=id,name,account_status`)
      const meData = await meResponse.json()
      accountId = meData.data?.[0]?.id || ''
      console.log(`[Manual Meta Sync] Got account ID: ${accountId}`)
    } catch (error) {
      console.error('[Manual Meta Sync] Failed to get account ID:', error)
      return NextResponse.json({ error: 'Failed to get Meta account ID' }, { status: 500 })
    }

    // Queue historical sync
    console.log(`[Manual Meta Sync] Queuing historical sync for connection ${connection.id}`)
    const result = await MetaQueueService.queueCompleteHistoricalSync(
      brandId,
      connection.id,
      connection.access_token,
      accountId
    )

    console.log(`[Manual Meta Sync] Queue result:`, result)

    return NextResponse.json({
      success: true,
      message: 'Manual historical sync queued',
      connectionId: connection.id,
      accountId,
      queueResult: result
    })

  } catch (error) {
    console.error('[Manual Meta Sync] Error:', error)
    return NextResponse.json({
      error: 'Failed to queue manual sync',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// GET endpoint to check current sync status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const brandId = searchParams.get('brandId')

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID required' }, { status: 400 })
    }

    const syncStatus = await MetaQueueService.getSyncStatus(brandId)

    return NextResponse.json({
      brandId,
      syncStatus,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[Manual Meta Sync] GET Error:', error)
    return NextResponse.json({
      error: 'Failed to get sync status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
