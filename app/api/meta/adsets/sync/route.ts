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

    // Get all active campaigns for this brand
    const { data: campaigns, error: campaignsError } = await supabase
      .from('meta_campaigns')
      .select('campaign_id, campaign_name')
      .eq('brand_id', brandId)
      .eq('status', 'ACTIVE')

    if (campaignsError) {
      console.error(`[AdSet Sync] Failed to fetch campaigns:`, campaignsError)
      return NextResponse.json(
        { error: 'Failed to fetch campaigns' },
        { status: 500 }
      )
    }

    if (!campaigns || campaigns.length === 0) {
      console.log(`[AdSet Sync] No active campaigns found for brand ${brandId}`)
      return NextResponse.json({
        success: true,
        message: 'No active campaigns to sync',
        adSetCount: 0,
        timestamp: new Date().toISOString()
      })
    }

    console.log(`[AdSet Sync] Found ${campaigns.length} active campaigns, fetching their ad sets`)

    // Fetch ad sets for each campaign
    let totalAdSets = 0
    const errors: string[] = []

    for (const campaign of campaigns) {
      try {
        console.log(`[AdSet Sync] Fetching ad sets for campaign ${campaign.campaign_id} (${campaign.campaign_name})`)
        const adSetsResult = await fetchMetaAdSets(brandId, campaign.campaign_id, true)

        if (adSetsResult.success && adSetsResult.adsets) {
          totalAdSets += adSetsResult.adsets.length
          console.log(`[AdSet Sync] ✅ Synced ${adSetsResult.adsets.length} ad sets for campaign ${campaign.campaign_name}`)
        } else {
          console.warn(`[AdSet Sync] ⚠️ Failed to sync ad sets for campaign ${campaign.campaign_name}:`, adSetsResult.error)
          errors.push(`${campaign.campaign_name}: ${adSetsResult.error}`)
        }
      } catch (error: any) {
        console.error(`[AdSet Sync] Error syncing campaign ${campaign.campaign_name}:`, error)
        errors.push(`${campaign.campaign_name}: ${error.message}`)
      }
    }

    console.log(`[AdSet Sync] Successfully synced ${totalAdSets} ad sets across ${campaigns.length} campaigns`)

    return NextResponse.json({
      success: true,
      message: `Synced ${totalAdSets} ad sets across ${campaigns.length} campaigns`,
      adSetCount: totalAdSets,
      campaignCount: campaigns.length,
      errors: errors.length > 0 ? errors : undefined,
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

