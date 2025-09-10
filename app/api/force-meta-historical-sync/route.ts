import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { MetaQueueService } from '@/lib/services/metaQueueService'

export async function GET(request: NextRequest) {
  try {
    // Hardcode the brand ID for easy testing
    const brandId = '0da80e8f-2df3-468d-9053-08fa4d24e6e8'
    
    console.log(`[Force Meta Sync] Starting forced historical sync for brand ${brandId}`)

    // Get the Meta connection
    const supabase = createClient()
    const { data: connection, error: connError } = await supabase
      .from('platform_connections')
      .select('id, access_token')
      .eq('brand_id', brandId)
      .eq('platform', 'meta')
      .eq('status', 'active')
      .single()

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

    console.log(`[Force Meta Sync] Found account: ${accountId}, created: ${accountCreatedDate}`)

    // Update sync status to in_progress
    await supabase
      .from('platform_connections')
      .update({ sync_status: 'in_progress' })
      .eq('id', connection.id)

    // Force queue the complete historical sync
    const result = await MetaQueueService.queueCompleteHistoricalSync(
      brandId,
      connection.id,
      connection.access_token,
      accountId,
      accountCreatedDate
    )

    console.log(`[Force Meta Sync] Successfully queued ${result.totalJobs} jobs`)

    return NextResponse.json({
      success: true,
      brandId,
      accountId,
      accountCreatedDate,
      result,
      message: `Forced historical sync initiated - ${result.totalJobs} jobs queued, estimated completion: ${result.estimatedCompletion}`
    })

  } catch (error) {
    console.error('[Force Meta Sync] Error:', error)
    return NextResponse.json({ 
      error: 'Failed to force historical sync',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
