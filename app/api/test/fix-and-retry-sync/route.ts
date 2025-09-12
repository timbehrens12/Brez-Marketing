import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { brandId } = await request.json()

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID required' }, { status: 400 })
    }

    console.log(`[Fix and Retry Sync] Cleaning up and retrying sync for brand: ${brandId}`)

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
      return NextResponse.json({
        error: 'No active Meta connection found',
        details: connError?.message
      }, { status: 404 })
    }

    // Get account ID
    const accountsResponse = await fetch(`https://graph.facebook.com/v18.0/me/adaccounts?access_token=${connection.access_token}&fields=id,name`)
    const accountsData = await accountsResponse.json()
    const adAccountId = accountsData.data?.[0]?.id

    if (!adAccountId) {
      return NextResponse.json({
        error: 'Failed to get ad account ID',
        response: accountsData
      }, { status: 500 })
    }

    console.log(`[Fix and Retry Sync] Using account: ${adAccountId}`)

    // Step 1: Clean up broken queue jobs
    console.log(`[Fix and Retry Sync] Step 1: Cleaning up old broken jobs...`)
    
    try {
      const cleanupResponse = await fetch('https://www.brezmarketingdashboard.com/api/test/meta-queue-cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      const cleanupResult = await cleanupResponse.json()
      console.log(`[Fix and Retry Sync] Queue cleanup result:`, cleanupResult)
    } catch (cleanupError) {
      console.warn(`[Fix and Retry Sync] Queue cleanup failed:`, cleanupError)
    }

    // Step 2: Queue NEW historical sync with CORRECT accountId
    console.log(`[Fix and Retry Sync] Step 2: Queueing NEW historical sync with correct accountId...`)
    
    const { MetaQueueService } = await import('@/lib/services/metaQueueService')

    try {
      await MetaQueueService.addJob('historical_campaigns', {
        connectionId: connection.id,
        brandId: brandId,
        accessToken: connection.access_token,  // REQUIRED FIELD
        accountId: adAccountId,  // REQUIRED FIELD - NOW INCLUDED!
        timeRange: {
          since: '2025-03-01',  // Full 6 months
          until: '2025-09-12'   // Today  
        },
        priority: 'high',
        description: 'FIXED: Complete 6-month historical sync with daily breakdown and correct accountId',
        jobType: 'historical_campaigns' as any
      })

      console.log(`[Fix and Retry Sync] ✅ Queued FIXED 6-month historical sync`)
      
      // Update connection status to syncing
      await supabase
        .from('platform_connections')
        .update({
          sync_status: 'syncing',
          updated_at: new Date().toISOString()
        })
        .eq('id', connection.id)

    } catch (queueError) {
      console.error(`[Fix and Retry Sync] Failed to queue historical sync:`, queueError)
      return NextResponse.json({
        error: 'Failed to queue historical sync',
        details: queueError instanceof Error ? queueError.message : 'Unknown error'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Fix and retry sync completed successfully',
      connectionId: connection.id,
      adAccountId,
      actions: [
        'Cleaned up old broken queue jobs',
        'Queued new historical sync with correct accountId',
        'Updated connection status to syncing'
      ],
      expectedResult: 'Background worker should now sync 6 months of Meta data with proper accountId'
    })

  } catch (error) {
    console.error('[Fix and Retry Sync] Error:', error)
    return NextResponse.json({
      error: 'Fix and retry sync failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const brandId = url.searchParams.get('brandId')
  
  if (!brandId) {
    return NextResponse.json({ error: 'Brand ID required' }, { status: 400 })
  }

  return POST(new NextRequest(request.url, {
    method: 'POST',
    body: JSON.stringify({ brandId }),
    headers: { 'content-type': 'application/json' }
  }))
}
