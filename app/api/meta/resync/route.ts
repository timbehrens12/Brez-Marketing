import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'
import { fetchMetaAdInsights } from '@/lib/services/meta-service'

export const dynamic = 'force-dynamic'

/**
 * API endpoint to resynchronize Meta data from scratch
 * This endpoint will clear the meta_ad_insights table for the brand
 * and then refetch all insights from Meta API
 */
export async function POST(request: NextRequest) {
  try {
    // Verify user authentication
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - You must be logged in to access this resource' },
        { status: 401 }
      )
    }
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const brandId = searchParams.get('brandId')
    
    if (!brandId) {
      return NextResponse.json(
        { error: 'Brand ID is required' },
        { status: 400 }
      )
    }
    
    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // 1. Get the active Meta connection for this brand
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')
      .eq('status', 'active')
      .single()
    
    if (connectionError || !connection) {
      console.error('[Meta Resync] Failed to get Meta connection:', connectionError)
      return NextResponse.json({ 
        error: 'No active Meta connection found for this brand' 
      }, { status: 404 })
    }
    
    // 2. Delete existing meta_ad_insights for this brand
    const { error: deleteError } = await supabase
      .from('meta_ad_insights')
      .delete()
      .eq('brand_id', brandId)
    
    if (deleteError) {
      console.error('[Meta Resync] Error deleting existing Meta insights:', deleteError)
      return NextResponse.json({
        error: 'Failed to clean existing data',
        details: deleteError.message
      }, { status: 500 })
    }
    
    // 3. Calculate date range (last 90 days)
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(endDate.getDate() - 90)
    
    // 4. Fetch and save new data
    const result = await fetchMetaAdInsights(brandId, startDate, endDate, false)
    
    if (result.success) {
      // 5. Also refresh campaigns and ad sets
      await fetch(`/api/meta/campaigns/sync?brandId=${brandId}`, { method: 'POST' })
      await fetch(`/api/meta/adsets/refresh-all?brandId=${brandId}`, { method: 'POST' })
      
      return NextResponse.json({
        success: true,
        message: 'Successfully resynchronized Meta data',
        insights: result.insights || 0,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      })
    } else {
      return NextResponse.json({
        error: 'Failed to fetch new Meta insights',
        details: result.error
      }, { status: 500 })
    }
  } catch (error: any) {
    console.error('[Meta Resync] Error:', error)
    
    return NextResponse.json({
      error: 'Failed to resynchronize Meta data',
      details: error.message
    }, { status: 500 })
  }
} 