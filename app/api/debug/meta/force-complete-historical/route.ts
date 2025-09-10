import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const brandId = '0da80e8f-2df3-468d-9053-08fa4d24e6e8'
    
    console.log(`[Force Complete Historical] Starting for brand ${brandId}`)

    // Get the Meta connection
    const supabase = createClient()
    const { data: connection, error: connError } = await supabase
      .from('platform_connections')
      .select('id, access_token, metadata')
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')
      .eq('status', 'active')
      .maybeSingle()

    if (connError || !connection) {
      return NextResponse.json({ 
        error: 'No active Meta connection found',
        details: connError?.message 
      }, { status: 404 })
    }

    // Get account ID from Meta API
    const meResponse = await fetch(`https://graph.facebook.com/v18.0/me/adaccounts?access_token=${connection.access_token}&fields=id,name,account_status,created_time`)
    if (!meResponse.ok) {
      throw new Error(`Meta API error: ${meResponse.status}`)
    }
    
    const meData = await meResponse.json()
    const account = meData.data?.[0]
    if (!account) {
      throw new Error('No ad account found')
    }

    const accountId = account.id
    const accountCreatedDate = account.created_time

    console.log(`[Force Complete Historical] Found account: ${accountId}, created: ${accountCreatedDate}`)

    // FORCE COMPLETE HISTORICAL SYNC FROM MARCH 2025
    // Override the default 12-month limitation
    const { MetaQueueService } = await import('@/lib/services/metaQueueService')
    
    const result = await MetaQueueService.queueCompleteHistoricalSync(
      brandId,
      connection.id,
      connection.access_token,
      accountId,
      '2025-03-01' // Force start from March 2025 where we know data exists
    )

    return NextResponse.json({ 
      success: true,
      message: 'Complete historical sync forced with March 2025 start date',
      ...result,
      accountId,
      connectionId: connection.id,
      forceStartDate: '2025-03-01'
    })
  } catch (error) {
    console.error('[Force Complete Historical] Error:', error)
    return NextResponse.json({ 
      error: 'Sync failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
