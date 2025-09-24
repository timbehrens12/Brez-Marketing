import { NextRequest, NextResponse } from 'next/server'
import { fetchMetaAdInsights } from '@/lib/services/meta-service'
import { createClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    console.log(`[Emergency Gap Fill] 🚨 EMERGENCY: Filling critical data gaps`)
    
    // HARDCODED for your brand - no auth needed
    const brandId = '1a30f34b-b048-4f80-b880-6c61bd12c720'
    
    // The missing months based on the database analysis
    const missingMonths = [
      { month: '2025-05', name: 'May 2025' },
      { month: '2025-06', name: 'June 2025' },
      { month: '2025-07', name: 'July 2025' },
      { month: '2025-08', name: 'August 2025' },
      { month: '2025-09', name: 'September 2025 (first half)' }
    ]
    
    const results = []
    
    for (const { month, name } of missingMonths) {
      try {
        console.log(`[Emergency Gap Fill] 📅 Syncing ${name} (${month})...`)
        
        // Calculate date range for the month
        const year = parseInt(month.split('-')[0])
        const monthNum = parseInt(month.split('-')[1])
        const startDate = new Date(year, monthNum - 1, 1)
        const endDate = new Date(year, monthNum, 0) // Last day of month
        
        // For September, only go up to Sept 20 to avoid overlap
        if (month === '2025-09') {
          endDate.setDate(20)
        }
        
        const startDateStr = startDate.toISOString().split('T')[0]
        const endDateStr = endDate.toISOString().split('T')[0]
        
        console.log(`[Emergency Gap Fill] Date range: ${startDateStr} to ${endDateStr}`)
        
        // Fetch insights for this month
        const insights = await fetchMetaAdInsights(brandId, startDateStr, endDateStr)
        
        console.log(`[Emergency Gap Fill] ✅ ${name}: ${insights?.length || 0} insights synced`)
        
        results.push({
          month,
          name,
          startDate: startDateStr,
          endDate: endDateStr,
          insights: insights?.length || 0,
          success: true
        })
        
        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000))
        
      } catch (error) {
        console.error(`[Emergency Gap Fill] ❌ Failed to sync ${name}:`, error)
        results.push({
          month,
          name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
    
    // Force aggregation after all syncs
    console.log(`[Emergency Gap Fill] 🔄 Forcing data aggregation...`)
    try {
      const supabase = createClient()
      await supabase.rpc('aggregate_meta_data', { brand_id_param: brandId })
      console.log(`[Emergency Gap Fill] ✅ Aggregation completed`)
    } catch (aggError) {
      console.error(`[Emergency Gap Fill] ❌ Aggregation failed:`, aggError)
    }
    
    const successCount = results.filter(r => r.success).length
    console.log(`[Emergency Gap Fill] 🎉 COMPLETE! ${successCount}/${results.length} months synced`)
    
    return NextResponse.json({ 
      success: true, 
      message: `Emergency gap fill completed: ${successCount}/${results.length} months synced`,
      results,
      totalInsights: results.reduce((sum, r) => sum + (r.insights || 0), 0)
    })
    
  } catch (error) {
    console.error('[Emergency Gap Fill] Critical error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
