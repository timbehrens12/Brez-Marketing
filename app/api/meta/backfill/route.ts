import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchMetaAdInsights } from '@/lib/services/meta-service'
import { subDays, format } from 'date-fns'

/**
 * API endpoint to specifically backfill Meta data for a given date range
 * This is useful for fixing missing data gaps and ensuring historical data completeness
 */
export async function POST(request: NextRequest) {
  try {
    // Get params from request body
    const { 
      brandId, 
      dateFrom,  // Optional: specific start date (yyyy-MM-dd)
      dateTo,    // Optional: specific end date (yyyy-MM-dd)
      days = 1   // Default to 1 day (yesterday)
    } = await request.json()
    
    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // Calculate date range
    const today = new Date()
    
    // If specific dates provided, use those
    let startDate: Date
    let endDate: Date
    
    if (dateFrom && dateTo) {
      // Parse provided dates
      startDate = new Date(dateFrom)
      endDate = new Date(dateTo)
    } else {
      // Default: backfill yesterday
      endDate = subDays(today, 1)
      startDate = subDays(endDate, days - 1)
    }
    
    // Format dates for display
    const startDateStr = format(startDate, 'yyyy-MM-dd')
    const endDateStr = format(endDate, 'yyyy-MM-dd')
    
    console.log(`[Meta Backfill] Starting backfill for brand ${brandId} from ${startDateStr} to ${endDateStr}`)

    // 1. Clear existing data for this brand and date range
    console.log(`[Meta Backfill] Clearing existing data for the specified date range`)
    const { error: deleteError } = await supabase
      .from('meta_ad_insights')
      .delete()
      .eq('brand_id', brandId)
      .gte('date', startDateStr)
      .lte('date', endDateStr)
    
    if (deleteError) {
      console.error(`[Meta Backfill] Error clearing existing data:`, deleteError)
      return NextResponse.json({ 
        error: 'Failed to clear existing data', 
        details: deleteError 
      }, { status: 500 })
    }

    // 2. Now fetch and store new data
    console.log(`[Meta Backfill] Fetching new data for the specified date range`)
    const result = await fetchMetaAdInsights(
      brandId,
      startDate,
      endDate,
      false  // Not dry run
    )
    
    if (!result.success) {
      console.error(`[Meta Backfill] Error fetching data:`, result.error)
      return NextResponse.json({ 
        error: 'Failed to fetch Meta data', 
        details: result.error 
      }, { status: 500 })
    }
    
    // 3. After backfill, regenerate the campaign data
    console.log(`[Meta Backfill] Regenerating campaign data...`)
    
    // Get all affected campaign IDs
    const { data: campaigns } = await supabase
      .from('meta_campaigns')
      .select('campaign_id')
      .eq('brand_id', brandId)
    
    if (campaigns && campaigns.length > 0) {
      const campaignIds = campaigns.map(c => c.campaign_id)
      
      try {
        // Call the SQL function to refresh campaign insights for the date range
        const { data: refreshResult, error: refreshError } = await supabase.rpc(
          'refresh_campaign_insights',
          {
            brand_uuid: brandId,
            p_from_date: startDateStr,
            p_to_date: endDateStr
          }
        )
        
        if (refreshError) {
          console.error(`[Meta Backfill] Error refreshing campaign insights:`, refreshError)
        } else {
          console.log(`[Meta Backfill] Campaign insights refresh complete. Result:`, refreshResult)
        }
      } catch (refreshError) {
        console.error(`[Meta Backfill] Exception during campaign refresh:`, refreshError)
      }
    }
    
    // 4. Log this backfill in the history table
    try {
      await supabase
        .from('meta_sync_history')
        .insert({
          brand_id: brandId,
          synced_at: new Date().toISOString(),
          date_from: startDateStr,
          date_to: endDateStr,
          record_count: result.count || 0,
          operation_type: 'backfill'
        });
      console.log(`[Meta Backfill] Recorded backfill in history`);
    } catch (err: unknown) {
      console.error(`[Meta Backfill] Error recording sync history:`, err);
    }

    return NextResponse.json({
      success: true,
      message: `Meta data backfilled successfully for brand ${brandId} from ${startDateStr} to ${endDateStr}`,
      count: result.count || 0,
      dateRange: {
        from: startDateStr,
        to: endDateStr
      }
    })
  } catch (error) {
    console.error('[Meta Backfill] Server error:', error)
    return NextResponse.json({ 
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 