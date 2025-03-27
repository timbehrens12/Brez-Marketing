import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchMetaAdInsights } from '@/lib/services/meta-service'
import { auth } from '@clerk/nextjs'
import { subDays } from 'date-fns'

/**
 * API endpoint to clear and resync Meta data for a brand with a custom date range
 * This is useful for testing and fixing data issues
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const url = new URL(request.url)
    const brandId = url.searchParams.get('brandId')
    const days = parseInt(url.searchParams.get('days') || '30')
    const force = url.searchParams.get('force') === 'true'
    const debug = url.searchParams.get('debug') === 'true'
    
    if (!brandId) {
      return NextResponse.json({ error: 'Missing brandId parameter' }, { status: 400 })
    }
    
    console.log(`[Meta Resync] Starting for brand ${brandId}, days: ${days}, force: ${force}`)
    
    // Calculate date range
    const endDate = new Date()
    const startDate = subDays(endDate, days)
    
    // Force-clear data if requested
    if (force) {
      console.log(`[Meta Resync] Force resync requested, clearing existing data`)
      
      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )
        
        // Clear all data for this brand
        const { error: deleteError } = await supabase
          .from('meta_ad_insights')
          .delete()
          .eq('brand_id', brandId)
        
        if (deleteError) {
          console.error(`[Meta Resync] Error clearing data:`, deleteError)
          return NextResponse.json({ 
            success: false, 
            error: 'Failed to clear existing data',
            details: deleteError
          }, { status: 500 })
        }
        
        console.log(`[Meta Resync] Successfully cleared Meta data for brand ${brandId}`)
      } catch (error) {
        console.error(`[Meta Resync] Error in force clear:`, error)
        return NextResponse.json({ 
          success: false, 
          error: 'Exception during forced clear',
          details: error instanceof Error ? error.message : String(error)
        }, { status: 500 })
      }
    }
    
    // Run a dry run first if debug is enabled
    if (debug) {
      const dryRunResult = await fetchMetaAdInsights(brandId, startDate, endDate, true)
      console.log(`[Meta Resync] Dry run result:`, dryRunResult)
      
      if (!dryRunResult.success) {
        return NextResponse.json({
          success: false,
          error: 'Dry run failed',
          details: dryRunResult
        }, { status: 500 })
      }
    }
    
    // Fetch and sync data
    const result = await fetchMetaAdInsights(brandId, startDate, endDate)
    
    if (!result.success) {
      console.error(`[Meta Resync] Error syncing Meta data:`, result.error)
      return NextResponse.json({
        success: false,
        error: result.error,
        details: result
      }, { status: 500 })
    }
    
    console.log(`[Meta Resync] Successfully synced ${result.count || 0} Meta records`)
    
    return NextResponse.json({
      success: true,
      message: `Successfully synced ${result.count || 0} Meta records`,
      count: result.count
    })
  } catch (error) {
    console.error('Error in Meta resync:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Server error', 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
} 