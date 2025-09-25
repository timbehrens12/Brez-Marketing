import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs'

// Set maximum duration for Meta demographics sync (5 minutes)
export const maxDuration = 300

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

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Verify user has access to this brand
    const { data: brand } = await supabase
      .from('brands')
      .select('id, user_id')
      .eq('id', brandId)
      .single()

    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
    }

    // Check if user owns the brand or has shared access
    const isOwner = brand.user_id === userId
    let hasAccess = isOwner

    if (!isOwner) {
      const { data: accessCheck } = await supabase
        .from('brand_access')
        .select('id')
        .eq('brand_id', brandId)
        .eq('user_id', userId)
        .is('revoked_at', null)
        .single()

      hasAccess = !!accessCheck
    }

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get Meta connection
    const { data: connection } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')
      .eq('status', 'active')
      .single()

    if (!connection) {
      return NextResponse.json({ error: 'No active Meta connection found' }, { status: 404 })
    }

    // Trigger the Meta backfill to populate demographic data
    const protocol = request.headers.get('x-forwarded-proto') || 'https'
    const host = request.headers.get('host') || 'localhost:3000'
    const baseUrl = `${protocol}://${host}`
    
    console.log(`[Meta Demographics Sync] Starting REAL demographic data sync for brand ${brandId}`)
    
    try {
      // Import the real Meta service
      const { fetchMetaAdInsights } = await import('@/lib/services/meta-service')
      
      // 🎯 FIXED: ONLY sync September 1-24 as requested
      const endDate = new Date() // Today (Sept 24)
      const startDate = new Date('2025-09-01') // September 1st
      
      console.log(`[Meta Demographics Sync] 🎯 FOCUSED SYNC: September 1-24 ONLY as requested`)
      console.log(`[Meta Demographics Sync] 🔥 SYNC DATE RANGE: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]} (${Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))} days)`)
      console.log(`[Meta Demographics Sync] Fetching real Meta demographic data from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`)
      
      // Call the real Meta service to fetch and store demographic data with timeout
      // Increased timeout for 12-month sync (more data to process)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Sync timeout after 5 minutes')), 300000)
      )
      
      const result = await Promise.race([
        fetchMetaAdInsights(brandId, startDate, endDate, false),
        timeoutPromise
      ]) as any
      
      if (!result.success) {
        console.error('Meta demographic sync failed:', result.error)
        console.error('Meta demographic sync full result:', result)
        return NextResponse.json({ 
          error: 'Failed to sync Meta demographic data', 
          details: result.error,
          debugInfo: result
        }, { status: 500 })
      }
      
      console.log(`[Meta Demographics Sync] Successfully synced real Meta demographic data`)
      console.log(`[Meta Demographics Sync] Result:`, result)
      
      // Debug: Check what date ranges were actually stored
      const { data: storedDemographics } = await supabase
        .from('meta_demographics')
        .select('date_range_start, date_range_end, breakdown_type, breakdown_value, impressions, spend')
        .eq('brand_id', brandId)
        .order('date_range_start', { ascending: false })
        .limit(10)
      
      console.log(`[Meta Demographics Sync] 🔥 STORED DATA SAMPLE:`, {
        count: storedDemographics?.length || 0,
        dateRanges: storedDemographics?.map(d => `${d.date_range_start} to ${d.date_range_end}`).slice(0, 5),
        sample: storedDemographics?.slice(0, 3)
      })

    } catch (error) {
      console.error('Error in real demographic sync:', error)
      return NextResponse.json({ 
        error: 'Failed to sync demographic data', 
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Meta demographic data synced successfully',
      details: 'Real demographic and device performance data has been fetched from Meta API and stored'
    })

  } catch (error) {
    console.error('Error triggering Meta demographic sync:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
