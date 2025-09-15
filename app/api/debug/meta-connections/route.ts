import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * DEBUG ENDPOINT - Check what Meta connections exist for a brand
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const brandId = searchParams.get('brandId') || '1a30f34b-b048-4f80-b880-6c61bd12c720'

    console.log(`[Debug Meta Connections] Checking connections for brand: ${brandId}`)

    const supabase = createClient()
    
    // Get ALL Meta connections for this brand (any status)
    const { data: allConnections, error } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')
      .order('created_at', { ascending: false })

    console.log(`[Debug Meta Connections] Found ${allConnections?.length || 0} connections`)

    // Check for recent Meta data
    const { data: recentData } = await supabase
      .from('meta_ad_daily_insights')
      .select('id, date, ad_id, spent, impressions, clicks')
      .eq('brand_id', brandId)
      .order('date', { ascending: false })
      .limit(10)

    // Check for Meta campaigns
    const { data: campaigns } = await supabase
      .from('meta_campaigns')
      .select('id, name, status, spend, impressions, clicks')
      .eq('brand_id', brandId)
      .limit(10)

    return NextResponse.json({
      success: true,
      brandId,
      connections: allConnections?.map(conn => ({
        id: conn.id,
        status: conn.status,
        sync_status: conn.sync_status,
        created_at: conn.created_at,
        updated_at: conn.updated_at,
        last_sync_at: conn.last_sync_at,
        has_token: !!conn.access_token,
        token_length: conn.access_token?.length || 0,
        metadata: conn.metadata
      })) || [],
      recentData: recentData?.map(d => ({
        id: d.id,
        date: d.date,
        ad_id: d.ad_id,
        spent: d.spent,
        impressions: d.impressions,
        clicks: d.clicks
      })) || [],
      campaigns: campaigns?.map(c => ({
        id: c.id,
        name: c.name,
        status: c.status,
        spend: c.spend,
        impressions: c.impressions,
        clicks: c.clicks
      })) || [],
      summary: {
        connectionCount: allConnections?.length || 0,
        activeConnections: allConnections?.filter(c => c.status === 'active').length || 0,
        recentDataCount: recentData?.length || 0,
        campaignCount: campaigns?.length || 0
      }
    })

  } catch (error) {
    console.error('[Debug Meta Connections] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
