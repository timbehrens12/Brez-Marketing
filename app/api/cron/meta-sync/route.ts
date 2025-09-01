import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchMetaAdInsights } from '@/lib/services/meta-service'

const CRON_SECRET = process.env.CRON_SECRET

/**
 * Cron job to sync Meta Ads data daily
 * Should be called by a scheduler service with proper authentication
 */
export async function GET(request: NextRequest) {
  try {
    // Validate cron secret for security
    const url = new URL(request.url)
    const secret = url.searchParams.get('secret')
    
    if (!CRON_SECRET || secret !== CRON_SECRET) {
      console.log('[Meta Cron] Invalid or missing cron secret')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    console.log('[Meta Cron] Starting daily Meta data sync')
    
    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // Get all active Meta connections
    const { data: connections, error: connectionsError } = await supabase
      .from('platform_connections')
      .select('brand_id, id')
      .eq('platform_type', 'meta')
      .eq('status', 'active')
    
    if (connectionsError) {
      console.error('[Meta Cron] Error fetching connections:', connectionsError)
      return NextResponse.json({ error: 'Failed to fetch connections' }, { status: 500 })
    }
    
    if (!connections || connections.length === 0) {
      console.log('[Meta Cron] No active Meta connections found')
      return NextResponse.json({ 
        success: true, 
        message: 'No active Meta connections found'
      })
    }
    
    console.log(`[Meta Cron] Found ${connections.length} active Meta connections`)
    
    // Set date range (last 14 days to ensure fresh data - increased from 7 to ensure more comprehensive data)
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 14)
    
    // Track results
    const results = []
    
    // Process each connection
    for (const connection of connections) {
      try {
        console.log(`[Meta Cron] Syncing data for brand ${connection.brand_id}`)
        
        // Fetch ad insights - this will populate meta_ad_insights
        const result = await fetchMetaAdInsights(
          connection.brand_id,
          startDate,
          endDate
        )
        
        // Record the sync result
        results.push({
          brandId: connection.brand_id,
          success: result.success,
          message: result.message,
          count: result.count || 0
        })
        
        // After insights are fetched, ensure daily tables are synced
        if (result.success) {
          try {
            console.log(`[Meta Cron] Running database sync to update daily tables for brand ${connection.brand_id}`)
            
            // Execute the SQL function to sync higher level tables
            await supabase.rpc('sync_higher_level_insights')
            
            console.log(`[Meta Cron] Daily tables sync completed for brand ${connection.brand_id}`)
          } catch (syncError) {
            console.error(`[Meta Cron] Error syncing daily tables for brand ${connection.brand_id}:`, syncError)
          }
        }
        
      } catch (error) {
        console.error(`[Meta Cron] Error syncing brand ${connection.brand_id}:`, error)
        results.push({
          brandId: connection.brand_id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
    
    // Also trigger the backfill process to catch any missed syncs
    try {
      console.log('[Meta Cron] Running backfill to ensure all data is synced')
      
      // Run the backfill SQL script
      const { error: backfillError } = await supabase.rpc('backfill_meta_daily_insights')
      
      if (backfillError) {
        console.error('[Meta Cron] Error running backfill:', backfillError)
      } else {
        console.log('[Meta Cron] Backfill completed successfully')
      }
    } catch (backfillError) {
      console.error('[Meta Cron] Error running backfill:', backfillError)
    }
    
    console.log(`[Meta Cron] Completed sync for ${connections.length} brands`)
    
    return NextResponse.json({
      success: true,
      message: 'Meta data sync completed',
      results
    })
    
  } catch (error) {
    console.error('[Meta Cron] Error in cron job:', error)
    return NextResponse.json({ 
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 