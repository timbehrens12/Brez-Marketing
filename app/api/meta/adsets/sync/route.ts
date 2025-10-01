import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchMetaAdSets } from '@/lib/services/meta-service'

export const dynamic = 'force-dynamic'

/**
 * POST /api/meta/adsets/sync
 * Syncs ad set data from Meta API to database
 * Used to refresh ad set statuses and budgets
 */
export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const brandId = searchParams.get('brandId')

    if (!brandId) {
      return NextResponse.json(
        { error: 'brandId is required' },
        { status: 400 }
      )
    }

    console.log(`[AdSet Sync] Starting sync for brand ${brandId}`)

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Find the Meta connection for this brand
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')
      .eq('status', 'active')
      .single()

    if (connectionError || !connection) {
      console.error(`[AdSet Sync] No active Meta connection found for brand ${brandId}`)
      return NextResponse.json(
        { error: 'No active Meta connection found' },
        { status: 404 }
      )
    }

    // Fetch fresh ad set data from Meta API
    console.log(`[AdSet Sync] Fetching ad sets from Meta API`)
    const adSetsResult = await fetchMetaAdSets(brandId)

    if (!adSetsResult.success || !adSetsResult.adsets) {
      console.error(`[AdSet Sync] Failed to fetch ad sets:`, adSetsResult.error)
      return NextResponse.json(
        { error: adSetsResult.error || 'Failed to fetch ad sets from Meta' },
        { status: 500 }
      )
    }

    console.log(`[AdSet Sync] Successfully synced ${adSetsResult.adsets.length} ad sets`)

    return NextResponse.json({
      success: true,
      message: `Synced ${adSetsResult.adsets.length} ad sets`,
      adSetCount: adSetsResult.adsets.length,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('[AdSet Sync] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

