import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'
import { auth } from '@clerk/nextjs'

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { brandId = '1a30f34b-b048-4f80-b880-6c61bd12c720' } = await request.json()

    console.log(`[Complete Demographics] 🎯 Completing September demographics for brand ${brandId}`)

    // Import the service we need
    const { fetchMetaAdInsights } = await import('@/lib/services/meta-service')
    
    // September date range only - focused sync
    const startDate = new Date('2025-09-01')
    const endDate = new Date('2025-09-24')
    
    console.log(`[Complete Demographics] 📊 Syncing demographics for September 1-24`)
    
    try {
      // Sync ONLY demographics for September (skipDemographics=false, dryRun=false)
      const result = await fetchMetaAdInsights(brandId, startDate, endDate, false, false)
      const count = result?.length || 0
      
      console.log(`[Complete Demographics] ✅ September demographics completed: ${count} records`)
      
      // Check what we got
      const { data: demoCount } = await supabase
        .from('meta_demographics')
        .select('breakdown_type, count(*)')
        .eq('brand_id', brandId)
      
      const { data: deviceCount } = await supabase
        .from('meta_device_performance')
        .select('breakdown_type, count(*)')
        .eq('brand_id', brandId)
      
      console.log(`[Complete Demographics] 📊 Results:`)
      console.log(`[Complete Demographics] Demographics:`, demoCount)
      console.log(`[Complete Demographics] Device:`, deviceCount)
      
      return NextResponse.json({ 
        success: true, 
        message: 'September demographics completed',
        demographics: demoCount,
        device: deviceCount
      })

    } catch (syncError) {
      console.error(`[Complete Demographics] ❌ Sync failed:`, syncError)
      return NextResponse.json({ 
        success: false, 
        error: 'Demographics sync failed',
        details: syncError.message
      }, { status: 500 })
    }

  } catch (error) {
    console.error('[Complete Demographics] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    )
  }
}
