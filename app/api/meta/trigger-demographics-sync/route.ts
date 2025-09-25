import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs'

/**
 * Simple endpoint to trigger demographics sync for September 1-24
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

    console.log(`[Trigger Demographics] Starting September 1-24 demographics sync for brand ${brandId}`)

    // Import the Meta service
    const { fetchMetaAdInsights } = await import('@/lib/services/meta-service')
    
    // Sync ONLY September 1-24
    const startDate = new Date('2025-09-01')
    const endDate = new Date() // Today
    
    console.log(`[Trigger Demographics] Syncing ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`)
    
    // Call Meta service with demographics enabled
    const result = await fetchMetaAdInsights(brandId, startDate, endDate, false, false) // dryRun=false, skipDemographics=false
    
    if (!result.success) {
      console.error('[Trigger Demographics] Sync failed:', result.error)
      return NextResponse.json({ 
        error: 'Demographics sync failed', 
        details: result.error 
      }, { status: 500 })
    }

    console.log(`[Trigger Demographics] ✅ Sync complete!`)

    // Check what was actually stored
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: demographics } = await supabase
      .from('meta_demographics')
      .select('date_range_start, breakdown_type, breakdown_value')
      .eq('brand_id', brandId)
      .order('date_range_start', { ascending: false })
      .limit(10)

    const { data: devices } = await supabase
      .from('meta_device_performance')
      .select('date_range_start, breakdown_type, breakdown_value')
      .eq('brand_id', brandId)
      .order('date_range_start', { ascending: false })
      .limit(10)

    return NextResponse.json({
      success: true,
      message: 'Demographics sync completed',
      result: result,
      stored: {
        demographics: {
          count: demographics?.length || 0,
          sample: demographics?.slice(0, 3),
          dates: [...new Set(demographics?.map(d => d.date_range_start))]
        },
        devices: {
          count: devices?.length || 0,
          sample: devices?.slice(0, 3),
          dates: [...new Set(devices?.map(d => d.date_range_start))]
        }
      }
    })

  } catch (error) {
    console.error('Error triggering demographics sync:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
