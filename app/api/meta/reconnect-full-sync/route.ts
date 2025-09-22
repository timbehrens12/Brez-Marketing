import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

/**
 * PRODUCTION FIX: Complete 12-month sync after reconnection
 * This ensures ALL historical data is properly populated
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { brandId, accessToken, adAccountId } = await request.json()
    if (!brandId || !accessToken || !adAccountId) {
      return NextResponse.json({ 
        error: 'Brand ID, access token, and ad account ID required' 
      }, { status: 400 })
    }

    console.log(`🚀 [Meta Reconnect Full Sync] Starting COMPLETE 12-month sync for brand ${brandId}`)

    const supabase = createClient()

    // 1. Update connection to active and in_progress
    const { error: connectionError } = await supabase
      .from('platform_connections')
      .update({
        status: 'active',
        sync_status: 'in_progress',
        access_token: accessToken,
        metadata: { ad_account_id: adAccountId },
        updated_at: new Date().toISOString()
      })
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')

    if (connectionError) {
      console.error(`❌ [Meta Reconnect] Error updating connection:`, connectionError)
      return NextResponse.json({ error: 'Failed to update connection' }, { status: 500 })
    }

    // 2. Import Meta service for the complete sync
    const { fetchMetaAdInsights } = await import('@/lib/services/meta-service')

    // 3. Set up COMPLETE 12-month date range
    const endDate = new Date()
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - 12) // Exactly 12 months back

    console.log(`📅 [Meta Reconnect] Syncing COMPLETE range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`)

    // 4. Force the complete historical sync (not just recent days)
    const syncResult = await fetchMetaAdInsights(
      brandId, 
      startDate, 
      endDate, 
      false, // dryRun = false
      false  // skipDemographics = false
    )

    if (!syncResult.success) {
      console.error(`❌ [Meta Reconnect] Sync failed:`, syncResult.error)
      
      // Mark connection as failed
      await supabase
        .from('platform_connections')
        .update({
          sync_status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('brand_id', brandId)
        .eq('platform_type', 'meta')

      return NextResponse.json({
        error: 'Failed to sync Meta data',
        details: syncResult.error
      }, { status: 500 })
    }

    // 5. Force aggregation to ensure all data is properly structured
    console.log(`🔄 [Meta Reconnect] Force aggregating data...`)

    // Aggregate ad insights into adset daily insights
    await supabase.rpc('aggregate_meta_data', { target_brand_id: brandId })

    // 6. Mark sync as completed
    const { error: completeError } = await supabase
      .from('platform_connections')
      .update({
        sync_status: 'completed',
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')

    if (completeError) {
      console.error(`❌ [Meta Reconnect] Error marking complete:`, completeError)
    }

    console.log(`✅ [Meta Reconnect] COMPLETE! Brand ${brandId} has full 12-month data`)

    return NextResponse.json({
      success: true,
      message: 'Meta reconnected with complete 12-month sync',
      syncResult,
      dateRange: {
        from: startDate.toISOString().split('T')[0],
        to: endDate.toISOString().split('T')[0]
      },
      action: 'check_dashboard_data'
    })

  } catch (error) {
    console.error('❌ [Meta Reconnect] Error:', error)
    return NextResponse.json({
      error: 'Failed to reconnect Meta with full sync',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
