import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

/**
 * 🚨 NUCLEAR FIX: Clear bad July demographics data and sync fresh September data
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const brandId = searchParams.get('brandId')
    
    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID required' }, { status: 400 })
    }

    console.log(`[Demographics Fix] 🚨 NUCLEAR: Starting demographics date fix for brand ${brandId}`)

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 1. NUCLEAR: Delete ALL old demographics data (July 2025 corrupted data)
    console.log(`[Demographics Fix] 🧨 NUCLEAR: Clearing ALL old demographics data...`)
    
    const deleteResults = await Promise.all([
      // Delete ALL demographics data for this brand
      supabase
        .from('meta_demographics')
        .delete()
        .eq('brand_id', brandId),
      
      // Delete ALL device performance data for this brand
      supabase
        .from('meta_device_performance')
        .delete()
        .eq('brand_id', brandId)
    ])

    console.log(`[Demographics Fix] ✅ Nuclear cleanup complete:`, deleteResults.map(r => r.error || 'SUCCESS'))

    // 2. Trigger fresh September sync with correct dates
    console.log(`[Demographics Fix] 🔥 Triggering fresh September 2025 sync...`)
    
    const { fetchMetaAdInsights } = await import('@/lib/services/meta-service')
    
    // Sync September 1-24, 2025 (current month)
    const septemberStart = new Date('2025-09-01')
    const today = new Date()
    
    console.log(`[Demographics Fix] 📅 Syncing ${septemberStart.toISOString().split('T')[0]} to ${today.toISOString().split('T')[0]}`)
    
    // Do one comprehensive sync for September with demographics
    const insights = await fetchMetaAdInsights(brandId, septemberStart, today, false, false) // With demographics
    console.log(`[Demographics Fix] ✅ Fresh sync complete: ${insights?.length || 0} insights + demographics`)

    // 3. Verify the data is now correct
    const verifyResults = await Promise.all([
      supabase
        .from('meta_demographics')
        .select('date_range_start, breakdown_type, count(*)')
        .eq('brand_id', brandId)
        .gte('date_range_start', '2025-09-01')
        .limit(10),
      
      supabase
        .from('meta_device_performance')
        .select('date_range_start, breakdown_type, count(*)')
        .eq('brand_id', brandId)
        .gte('date_range_start', '2025-09-01')
        .limit(10)
    ])

    const [demoData, deviceData] = verifyResults
    
    console.log(`[Demographics Fix] 🔍 Verification - Demographics:`, demoData.data?.length || 0, 'records')
    console.log(`[Demographics Fix] 🔍 Verification - Device Data:`, deviceData.data?.length || 0, 'records')
    
    if (demoData.data?.length || deviceData.data?.length) {
      console.log(`[Demographics Fix] 🎉 SUCCESS! Fresh data with correct September dates`)
      
      return NextResponse.json({
        success: true,
        message: 'Demographics dates fixed successfully',
        details: {
          demographicsRecords: demoData.data?.length || 0,
          deviceRecords: deviceData.data?.length || 0,
          sampleDates: demoData.data?.map(d => d.date_range_start) || [],
          syncedInsights: insights?.length || 0
        }
      })
    } else {
      console.log(`[Demographics Fix] ⚠️ No data returned - check Meta API connection`)
      
      return NextResponse.json({
        success: false,
        message: 'No demographics data found after sync - check Meta connection',
        syncedInsights: insights?.length || 0
      }, { status: 404 })
    }

  } catch (error) {
    console.error('[Demographics Fix] Error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}
