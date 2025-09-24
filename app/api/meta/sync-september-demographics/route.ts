import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log(`[September Demographics] 🎯 Starting September demographics sync...`)

    // Import the service we need
    const { fetchMetaAdInsights } = await import('@/lib/services/meta-service')
    
    const brandId = '1a30f34b-b048-4f80-b880-6c61bd12c720'
    const startDate = new Date('2025-09-01')
    const endDate = new Date('2025-09-24')
    
    console.log(`[September Demographics] 📊 Syncing demographics for September 1-24`)
    
    // Sync ONLY demographics for September (skipDemographics=false, dryRun=false)
    const result = await fetchMetaAdInsights(brandId, startDate, endDate, false, false)
    const count = result?.length || 0
    
    console.log(`[September Demographics] ✅ September demographics completed: ${count} records`)
    
    return NextResponse.json({ 
      success: true, 
      message: 'September demographics sync completed',
      recordCount: count,
      dateRange: 'September 1-24, 2025'
    })

  } catch (error) {
    console.error('[September Demographics] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Server error', details: error.message },
      { status: 500 }
    )
  }
}
