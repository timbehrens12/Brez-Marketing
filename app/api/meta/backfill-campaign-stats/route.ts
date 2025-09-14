import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { auth } from '@clerk/nextjs/server'

/**
 * API endpoint to backfill meta_campaign_daily_stats with historical data from meta_ad_daily_insights
 * This solves the issue where campaign widget only shows 4 days of data instead of full historical data
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { brandId } = await request.json()
    
    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    const supabase = createClient()

    console.log(`[Campaign Stats Backfill] Starting backfill for brand ${brandId}`)

    // Get the active campaign(s) for this brand
    const { data: campaigns, error: campaignError } = await supabase
      .from('meta_campaigns')
      .select('campaign_id, campaign_name, status')
      .eq('brand_id', brandId)
      .eq('status', 'ACTIVE')

    if (campaignError) {
      console.error('Error fetching campaigns:', campaignError)
      return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 })
    }

    if (!campaigns || campaigns.length === 0) {
      console.log(`[Campaign Stats Backfill] No active campaigns found for brand ${brandId}`)
      return NextResponse.json({ 
        success: true, 
        message: 'No active campaigns found to backfill',
        backfilledRecords: 0
      })
    }

    // Use the first active campaign for historical data (account-level data)
    const primaryCampaign = campaigns[0]
    console.log(`[Campaign Stats Backfill] Using campaign ${primaryCampaign.campaign_id} (${primaryCampaign.campaign_name}) for historical data`)

    // Get all historical data from meta_ad_daily_insights (which is actually account-level)
    const { data: historicalData, error: historicalError } = await supabase
      .from('meta_ad_daily_insights')
      .select('*')
      .eq('brand_id', brandId)
      .eq('ad_id', 'account_level_data') // Only account-level data
      .order('date', { ascending: true })

    if (historicalError) {
      console.error('Error fetching historical data:', historicalError)
      return NextResponse.json({ error: 'Failed to fetch historical data' }, { status: 500 })
    }

    if (!historicalData || historicalData.length === 0) {
      console.log(`[Campaign Stats Backfill] No historical data found in meta_ad_daily_insights for brand ${brandId}`)
      return NextResponse.json({ 
        success: true, 
        message: 'No historical data found to backfill',
        backfilledRecords: 0
      })
    }

    console.log(`[Campaign Stats Backfill] Found ${historicalData.length} historical records from ${historicalData[0].date} to ${historicalData[historicalData.length - 1].date}`)

    // Check what dates already exist in meta_campaign_daily_stats to avoid duplicates
    const { data: existingStats, error: existingError } = await supabase
      .from('meta_campaign_daily_stats')
      .select('date')
      .eq('brand_id', brandId)
      .eq('campaign_id', primaryCampaign.campaign_id)

    if (existingError) {
      console.error('Error checking existing stats:', existingError)
      return NextResponse.json({ error: 'Failed to check existing data' }, { status: 500 })
    }

    const existingDates = new Set((existingStats || []).map(stat => stat.date))
    console.log(`[Campaign Stats Backfill] Found ${existingDates.size} existing records, skipping duplicates`)

    // Transform historical data to campaign stats format
    const campaignStatsToInsert = historicalData
      .filter(record => !existingDates.has(record.date)) // Skip existing dates
      .map(record => ({
        brand_id: brandId,
        campaign_id: primaryCampaign.campaign_id,
        date: record.date,
        spend: parseFloat(record.spent?.toString() || '0'),
        impressions: record.impressions || 0,
        clicks: record.clicks || 0,
        reach: record.reach || 0,
        conversions: record.conversions || 0,
        ctr: parseFloat(record.ctr?.toString() || '0'),
        cpc: parseFloat(record.cpc?.toString() || '0'),
        cost_per_conversion: parseFloat(record.cost_per_conversion?.toString() || '0'),
        roas: 0, // Will calculate if we have purchase data
        results: record.results || 0,
        cost_per_result: parseFloat(record.cost_per_result?.toString() || '0'),
        page_view_count: record.page_view_count || 0,
        add_to_cart_count: record.add_to_cart_count || 0,
        initiate_checkout_count: record.initiate_checkout_count || 0,
        add_payment_info_count: record.add_payment_info_count || 0,
        view_content_count: record.view_content_count || 0,
        purchase_count: record.purchase_count || 0,
        lead_count: record.lead_count || 0,
        complete_registration_count: record.complete_registration_count || 0,
        funnel_conversion_rate: parseFloat(record.funnel_conversion_rate?.toString() || '0'),
        search_count: record.search_count || 0,
        add_to_wishlist_count: record.add_to_wishlist_count || 0,
        last_refresh_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))

    if (campaignStatsToInsert.length === 0) {
      console.log(`[Campaign Stats Backfill] All historical data already exists in campaign stats table`)
      return NextResponse.json({ 
        success: true, 
        message: 'All historical data already backfilled',
        backfilledRecords: 0,
        totalHistoricalRecords: historicalData.length,
        existingRecords: existingDates.size
      })
    }

    // Insert the campaign stats in batches to avoid timeouts
    const batchSize = 50
    let totalInserted = 0

    for (let i = 0; i < campaignStatsToInsert.length; i += batchSize) {
      const batch = campaignStatsToInsert.slice(i, i + batchSize)
      
      const { error: insertError } = await supabase
        .from('meta_campaign_daily_stats')
        .insert(batch)

      if (insertError) {
        console.error(`Error inserting batch ${Math.floor(i / batchSize) + 1}:`, insertError)
        return NextResponse.json({ 
          error: `Failed to insert batch ${Math.floor(i / batchSize) + 1}: ${insertError.message}`,
          partialSuccess: true,
          insertedSoFar: totalInserted
        }, { status: 500 })
      }

      totalInserted += batch.length
      console.log(`[Campaign Stats Backfill] Inserted batch ${Math.floor(i / batchSize) + 1}: ${batch.length} records (total: ${totalInserted})`)
    }

    console.log(`[Campaign Stats Backfill] ✅ Successfully backfilled ${totalInserted} campaign stats records`)

    return NextResponse.json({
      success: true,
      message: `Successfully backfilled ${totalInserted} campaign stats records`,
      backfilledRecords: totalInserted,
      totalHistoricalRecords: historicalData.length,
      existingRecords: existingDates.size,
      campaignUsed: {
        id: primaryCampaign.campaign_id,
        name: primaryCampaign.campaign_name
      },
      dateRange: {
        from: historicalData[0]?.date,
        to: historicalData[historicalData.length - 1]?.date
      }
    })

  } catch (error) {
    console.error('Campaign stats backfill error:', error)
    return NextResponse.json({ 
      error: 'Server error during backfill',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
