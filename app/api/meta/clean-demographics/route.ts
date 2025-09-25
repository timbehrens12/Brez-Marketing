import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs'

/**
 * Clean all demographics data except September 2025 data
 * This removes the random old data from April, July, etc.
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

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    console.log(`[Clean Demographics] 🧹 Cleaning old random demographics data for brand ${brandId}`)

    // First, show what we have before cleaning
    const { data: beforeClean } = await supabase
      .from('meta_demographics')
      .select('date_range_start, breakdown_type')
      .eq('brand_id', brandId)
      .order('date_range_start', { ascending: false })

    console.log(`[Clean Demographics] Before: ${beforeClean?.length || 0} total records`)
    console.log(`[Clean Demographics] Date ranges found:`, 
      [...new Set(beforeClean?.map(d => d.date_range_start))].slice(0, 10))

    // Delete demographics data BEFORE September 1st
    const { data: deletedDemoBefore, error: demoErrorBefore } = await supabase
      .from('meta_demographics')
      .delete()
      .eq('brand_id', brandId)
      .lt('date_range_start', '2025-09-01')

    // Delete demographics data AFTER September 30th  
    const { data: deletedDemoAfter, error: demoErrorAfter } = await supabase
      .from('meta_demographics')
      .delete()
      .eq('brand_id', brandId)
      .gt('date_range_start', '2025-09-30')

    if (demoErrorBefore || demoErrorAfter) {
      console.error('[Clean Demographics] Error deleting old demographics:', demoErrorBefore || demoErrorAfter)
    }

    // Delete device data BEFORE September 1st
    const { data: deletedDeviceBefore, error: deviceErrorBefore } = await supabase
      .from('meta_device_performance')
      .delete()
      .eq('brand_id', brandId)
      .lt('date_range_start', '2025-09-01')

    // Delete device data AFTER September 30th
    const { data: deletedDeviceAfter, error: deviceErrorAfter } = await supabase
      .from('meta_device_performance')
      .delete()
      .eq('brand_id', brandId)
      .gt('date_range_start', '2025-09-30')

    if (deviceErrorBefore || deviceErrorAfter) {
      console.error('[Clean Demographics] Error deleting old device data:', deviceErrorBefore || deviceErrorAfter)
    }

    // Check what remains after cleaning
    const { data: afterClean } = await supabase
      .from('meta_demographics')
      .select('date_range_start, breakdown_type')
      .eq('brand_id', brandId)
      .order('date_range_start', { ascending: false })

    console.log(`[Clean Demographics] After: ${afterClean?.length || 0} total records`)
    console.log(`[Clean Demographics] Remaining date ranges:`, 
      [...new Set(afterClean?.map(d => d.date_range_start))].slice(0, 10))

    return NextResponse.json({
      success: true,
      message: 'Old demographics data cleaned successfully',
      before: beforeClean?.length || 0,
      after: afterClean?.length || 0,
      removed: (beforeClean?.length || 0) - (afterClean?.length || 0),
      remaining_dates: [...new Set(afterClean?.map(d => d.date_range_start))]
    })

  } catch (error) {
    console.error('Error cleaning demographics data:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
