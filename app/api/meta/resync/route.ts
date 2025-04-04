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
    const { brandId, days = 60 } = await request.json()
    
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

    // First, clear existing data for this brand and date range
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
      return NextResponse.json({ 
        error: 'Failed to fetch Meta data', 
        details: result.error 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Meta data resynced successfully for brand ${brandId} from ${startDateStr} to ${endDateStr}`,
      count: result.count || 0
    })
  } catch (error) {
    console.error('[Meta Resync] Server error:', error)
    return NextResponse.json({ 
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 