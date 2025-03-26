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
    
    // Set date range (last 7 days to ensure fresh data)
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 7)
    
    // Track results
    const results = []
    
    // Process each connection
    for (const connection of connections) {
      try {
        console.log(`[Meta Cron] Syncing data for brand ${connection.brand_id}`)
        
        const result = await fetchMetaAdInsights(
          connection.brand_id,
          startDate,
          endDate
        )
        
        results.push({
          brandId: connection.brand_id,
          success: result.success,
          message: result.message,
          count: result.count || 0
        })
        
      } catch (error) {
        console.error(`[Meta Cron] Error syncing brand ${connection.brand_id}:`, error)
        results.push({
          brandId: connection.brand_id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
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