import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

/**
 * Force refresh Meta data - bypasses ALL caching and fetches fresh data from Meta API
 */
export async function POST(request: NextRequest) {
  try {
    const { brandId, connectionId } = await request.json()
    
    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    console.log(`[Force Meta Refresh] Starting aggressive refresh for brand ${brandId}`)
    
    // Step 1: Get Meta connection if not provided
    let metaConnectionId = connectionId
    if (!metaConnectionId) {
      const { data: connection } = await supabase
        .from('platform_connections')
        .select('id')
        .eq('brand_id', brandId)
        .eq('platform_type', 'meta')
        .eq('status', 'active')
        .single()
      
      if (!connection) {
        return NextResponse.json({ error: 'No active Meta connection found' }, { status: 404 })
      }
      metaConnectionId = connection.id
    }
    
    // Step 2: Force sync from Meta API with today's date
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    console.log(`[Force Meta Refresh] Syncing data for dates ${yesterday} to ${today}`)
    
    // Call the Meta sync endpoint directly with force parameters
    const syncResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/meta/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        connectionId: metaConnectionId,
        startDate: yesterday,
        endDate: today,
        forceRefresh: true,
        bypassCache: true,
        aggressiveSync: true,
        clearCache: true
      })
    })
    
    const syncResult = await syncResponse.json()
    console.log(`[Force Meta Refresh] Sync response:`, syncResult)
    
    // Step 3: Clear any cached data and force database refresh
    await supabase
      .from('meta_campaign_daily_insights')
      .update({ last_refresh_date: new Date().toISOString() })
      .eq('brand_id', brandId)
    
    await supabase
      .from('meta_campaign_daily_stats')
      .update({ last_refresh_date: new Date().toISOString() })
      .eq('brand_id', brandId)
    
    // Step 4: Trigger campaign status refresh
    const statusResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/meta/refresh-campaign-statuses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brandId,
        forceRefresh: true
      })
    })
    
    const statusResult = await statusResponse.json()
    console.log(`[Force Meta Refresh] Status refresh response:`, statusResult)
    
    return NextResponse.json({
      success: true,
      message: 'Meta data force refreshed successfully',
      syncResult,
      statusResult,
      refreshedAt: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('[Force Meta Refresh] Error:', error)
    return NextResponse.json({ 
      error: 'Failed to force refresh Meta data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 