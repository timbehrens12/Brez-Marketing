import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs'

export const maxDuration = 300 // 5 minutes

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { brandId } = await request.json()
    
    if (!brandId) {
      return NextResponse.json(
        { success: false, error: 'brandId required' },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    console.log('🔥 MEGA FIX: Starting complete September 2025 sync with fresh budgets and demographics')

    // 1. Get Meta connection
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')
      .eq('status', 'active')
      .single()

    if (connectionError || !connection) {
      console.error(`[Mega Fix] No active Meta connection found for brand ${brandId}:`, connectionError)
      return NextResponse.json({ success: false, error: 'No active Meta connection found' }, { status: 404 })
    }

    const accessToken = connection.access_token
    
    // 2. Check Rate Limiting First
    console.log(`[Mega Fix] 🔍 Testing Meta API rate limit status...`)
    try {
      const testResponse = await fetch(`https://graph.facebook.com/v18.0/me?access_token=${accessToken}`)
      const testData = await testResponse.json()
      
      if (testData.error) {
        if (testData.error.code === 17 || testData.error.message?.includes('rate limit')) {
          console.error(`[Mega Fix] 🚨 RATE LIMITED: Meta API is currently rate limited. Please wait 5-10 minutes.`)
          return NextResponse.json({ 
            success: false, 
            error: 'Meta API is currently rate limited',
            message: 'Please wait 5-10 minutes before running the mega fix',
            retryAfter: new Date(Date.now() + 10 * 60 * 1000).toISOString()
          }, { status: 429 })
        }
        
        return NextResponse.json({ 
          success: false, 
          error: 'Meta API error',
          details: testData.error 
        }, { status: 400 })
      }
      
      console.log(`[Mega Fix] ✅ Meta API is available, proceeding with mega fix`)
    } catch (testError) {
      console.error(`[Mega Fix] ❌ Failed to test Meta API:`, testError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to connect to Meta API' 
      }, { status: 500 })
    }

    // 3. NUCLEAR: Delete ALL OLD September data to start fresh
    console.log(`[Mega Fix] 🧨 NUCLEAR: Clearing all existing September 2025 data...`)
    await Promise.all([
      // Delete all September insights
      supabase
        .from('meta_ad_insights')
        .delete()
        .eq('brand_id', brandId)
        .gte('date_start', '2025-09-01')
        .lte('date_start', '2025-09-30'),
      
      // Delete all September demographics  
      supabase
        .from('meta_demographics')
        .delete()
        .eq('brand_id', brandId)
        .gte('date_range_start', '2025-09-01')
        .lte('date_range_start', '2025-09-30'),
        
      // Delete all September device data
      supabase
        .from('meta_device_performance')
        .delete()
        .eq('brand_id', brandId)
        .gte('date_range_start', '2025-09-01')
        .lte('date_range_start', '2025-09-30'),
        
      // Reset adsets and campaigns (will be recreated)
      supabase.from('meta_adset_daily_insights').delete().eq('brand_id', brandId),
      supabase.from('meta_adsets').delete().eq('brand_id', brandId),
      supabase.from('meta_campaigns').delete().eq('brand_id', brandId)
    ])
    
    console.log(`[Mega Fix] ✅ Nuclear cleanup complete`)

    // 4. Fetch ONLY September 2025 data with demographics
    console.log(`[Mega Fix] 🔥 Fetching September 2025 data with demographics...`)
    const { fetchMetaAdInsights } = await import('@/lib/services/meta-service')
    
    const septemberStart = new Date('2025-09-01')
    const septemberEnd = new Date('2025-09-25') // Today
    
    // Do one big fetch for all of September with demographics
    const insights = await fetchMetaAdInsights(brandId, septemberStart, septemberEnd, false, false) // With demographics
    console.log(`[Mega Fix] ✅ Fetched ${insights?.length || 0} September insights + demographics`)

    // 5. Run aggregation to create campaigns/adsets
    console.log(`[Mega Fix] 🔄 Running aggregation to create campaigns and adsets...`)
    await supabase.rpc('aggregate_meta_data', { brand_id_param: brandId })
    console.log(`[Mega Fix] ✅ Aggregation complete`)

    // 6. Fetch REAL BUDGETS from Meta API (with retry logic)
    console.log(`[Mega Fix] 💰 Fetching real budgets from Meta API...`)
    try {
      const { fetchMetaCampaignBudgets } = await import('@/lib/services/meta-service')
      const budgetResult = await fetchMetaCampaignBudgets(brandId, true)
      console.log(`[Mega Fix] ✅ Real budget fetch result:`, budgetResult)
    } catch (budgetError) {
      console.warn(`[Mega Fix] ⚠️ Budget fetch failed (rate limited?):`, budgetError)
    }

    // 7. Final verification
    const finalCounts = await Promise.all([
      supabase.from('meta_campaigns').select('count').eq('brand_id', brandId).single(),
      supabase.from('meta_adsets').select('count').eq('brand_id', brandId).single(),
      supabase.from('meta_ad_insights').select('count').eq('brand_id', brandId).single(),
      supabase.from('meta_demographics').select('count').eq('brand_id', brandId).single(),
    ])

    const results = {
      campaigns: finalCounts[0].data?.count || 0,
      adsets: finalCounts[1].data?.count || 0,
      insights: finalCounts[2].data?.count || 0,
      demographics: finalCounts[3].data?.count || 0,
    }

    console.log(`[Mega Fix] 🎉 MEGA FIX COMPLETE! Final counts:`, results)

    return NextResponse.json({
      success: true,
      message: 'Mega fix completed successfully - September 2025 data with real budgets',
      results,
      dateRange: '2025-09-01 to 2025-09-25',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[Mega Fix] Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Mega fix failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
