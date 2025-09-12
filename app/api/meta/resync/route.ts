import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchMetaAdInsights } from '@/lib/services/meta-service'

/**
 * API endpoint to clear and resync Meta data for a brand with a custom date range
 * This is useful for testing and fixing data issues
 */
export async function POST(request: NextRequest) {
  try {
    // Get params from request body
    const { brandId, days = 60, refresh_cache = false } = await request.json()
    
    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - (days || 60))
    
    // Format dates for display
    const startDateStr = startDate.toISOString().split('T')[0]
    const endDateStr = endDate.toISOString().split('T')[0]
    
    console.log(`[Meta Resync] Starting resync for brand ${brandId} from ${startDateStr} to ${endDateStr}`)

    // First check if we should check for cached data before clearing
    if (!refresh_cache) {
      // Check if we have recent data in the date range
      const { data: existingData, error: checkError } = await supabase
        .from('meta_ad_insights')
        .select('id')
        .eq('brand_id', brandId)
        .gte('date', startDateStr)
        .lte('date', endDateStr)
        .limit(1)
      
      if (!checkError && existingData && existingData.length > 0) {
        const lastRefreshTime = new Date();
        lastRefreshTime.setHours(lastRefreshTime.getHours() - 1); // Data less than 1 hour old
        
        // Check if we've synced data recently
        const { data: recentSync, error: recentError } = await supabase
          .from('meta_sync_history')
          .select('id')
          .eq('brand_id', brandId)
          .gt('synced_at', lastRefreshTime.toISOString())
          .limit(1)
        
        if (!recentError && recentSync && recentSync.length > 0) {
          console.log(`[Meta Resync] Using cached data (synced within last hour)`)
          return NextResponse.json({
            success: true,
            message: 'Using cached data (synced within last hour)',
            cached: true
          })
        }
      }
    }

    // Clear existing data for this brand and date range
    console.log(`[Meta Resync] Clearing existing data`)
    const { error: deleteError } = await supabase
      .from('meta_ad_insights')
      .delete()
      .eq('brand_id', brandId)
      .gte('date', startDateStr)
      .lte('date', endDateStr)
    
    if (deleteError) {
      console.error(`[Meta Resync] Error clearing existing data:`, deleteError)
      return NextResponse.json({ 
        error: 'Failed to clear existing data', 
        details: deleteError 
      }, { status: 500 })
    }

    // Now fetch and store new data
    console.log(`[Meta Resync] Fetching new data`)
    const result = await fetchMetaAdInsights(
      brandId,
      startDate,
      endDate
    )
    
    if (!result.success) {
      console.error(`[Meta Resync] Error fetching data:`, result.error)
      
      // Check if this was due to rate limiting
      if (result.error?.includes('rate limit') || result.details?.code === 80004) {
        // If rate limited, let's see if we have older data we can use
        const { data: oldData } = await supabase
          .from('meta_ad_insights')
          .select('id')
          .eq('brand_id', brandId)
          .limit(1)
        
        if (oldData && oldData.length > 0) {
          return NextResponse.json({
            success: true,
            rateLimited: true,
            message: 'Using existing data due to Meta API rate limits. Please try again later.',
          })
        }
      }
      
      return NextResponse.json({ 
        error: 'Failed to fetch Meta data', 
        details: result.error 
      }, { status: 500 })
    }
    
    // Log this sync in the history table
    try {
      await supabase
        .from('meta_sync_history')
        .insert({
          brand_id: brandId,
          synced_at: new Date().toISOString(),
          date_from: startDateStr,
          date_to: endDateStr,
          record_count: result.count || 0
        });
      console.log(`[Meta Resync] Recorded sync in history`);
    } catch (err: unknown) {
      console.error(`[Meta Resync] Error recording sync history:`, err);
    }

    return NextResponse.json({
      success: true,
      message: `Meta data resynced successfully for brand ${brandId} from ${startDateStr} to ${endDateStr}`,
      count: result.count || 0,
      rateLimited: result.rateLimited || false
    })
  } catch (error) {
    console.error('[Meta Resync] Server error:', error)
    return NextResponse.json({ 
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 