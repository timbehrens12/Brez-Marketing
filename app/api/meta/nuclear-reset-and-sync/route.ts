import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs'

export const maxDuration = 300 // 5 minutes

/**
 * NUCLEAR OPTION: Complete Meta data reset and fresh September sync
 * This deletes EVERYTHING and rebuilds from scratch with proper data
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

    console.log(`[NUCLEAR RESET] 🚨 Starting complete Meta data reset for brand ${brandId}`)
    console.log(`[NUCLEAR RESET] This will delete ALL Meta data and rebuild with Sept 1-24`)

    // Step 1: NUCLEAR DELETE - Remove ALL Meta data for this brand
    console.log(`[NUCLEAR RESET] Step 1: 💥 DELETING ALL META DATA...`)
    
    const deletePromises = [
      supabase.from('meta_ad_insights').delete().eq('brand_id', brandId),
      supabase.from('meta_adset_daily_insights').delete().eq('brand_id', brandId),
      supabase.from('meta_demographics').delete().eq('brand_id', brandId),
      supabase.from('meta_device_performance').delete().eq('brand_id', brandId),
      supabase.from('meta_campaigns').delete().eq('brand_id', brandId),
      supabase.from('meta_adsets').delete().eq('brand_id', brandId),
      supabase.from('meta_campaign_daily_stats').delete().eq('brand_id', brandId)
    ]

    const deleteResults = await Promise.allSettled(deletePromises)
    console.log(`[NUCLEAR RESET] 💥 Deletion complete. Results:`, deleteResults.map((r, i) => 
      ({ table: ['meta_ad_insights', 'meta_adset_daily_insights', 'meta_demographics', 'meta_device_performance', 'meta_campaigns', 'meta_adsets', 'meta_campaign_daily_stats'][i], 
         status: r.status })))

    // Step 2: Verify deletion
    const { data: remainingRecords } = await supabase
      .from('meta_ad_insights')
      .select('id')
      .eq('brand_id', brandId)
      .limit(1)

    console.log(`[NUCLEAR RESET] ✅ Verification: ${remainingRecords?.length || 0} records remaining (should be 0)`)

    // Step 3: Get Meta connection
    const { data: connection } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')
      .eq('status', 'active')
      .single()

    if (!connection) {
      return NextResponse.json({ 
        error: 'No active Meta connection found. Please reconnect Meta first.',
        step: 'connection_check'
      }, { status: 404 })
    }

    console.log(`[NUCLEAR RESET] ✅ Meta connection found: ${connection.metadata?.ad_account_id}`)

    // Step 4: FORCE SYNC September 1-24 with demographics
    console.log(`[NUCLEAR RESET] Step 2: 🔥 SYNCING SEPTEMBER 1-24 WITH DEMOGRAPHICS...`)
    
    try {
      const { fetchMetaAdInsights } = await import('@/lib/services/meta-service')
      
      const startDate = new Date('2025-09-01')
      const endDate = new Date('2025-09-24') // Up to today
      
      console.log(`[NUCLEAR RESET] 🎯 Syncing ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`)
      console.log(`[NUCLEAR RESET] 🎯 WITH DEMOGRAPHICS ENABLED`)
      
      // Call the Meta service with demographics enabled
      const result = await fetchMetaAdInsights(
        brandId,
        startDate, 
        endDate,
        false, // dryRun = false (actually sync)
        false  // skipDemographics = false (include demographics)
      )
      
      console.log(`[NUCLEAR RESET] 📊 Sync result:`, result)
      
      if (!result || !result.success) {
        throw new Error(`Meta sync failed: ${result?.error || 'Unknown error'}`)
      }

      // Step 5: VERIFY data was actually stored
      console.log(`[NUCLEAR RESET] Step 3: 🔍 VERIFYING DATA WAS STORED...`)
      
      const verificationQueries = await Promise.all([
        supabase.from('meta_ad_insights').select('id, date').eq('brand_id', brandId).order('date', { ascending: false }).limit(5),
        supabase.from('meta_demographics').select('id, date_range_start, breakdown_type').eq('brand_id', brandId).limit(5),
        supabase.from('meta_device_performance').select('id, date_range_start, breakdown_type').eq('brand_id', brandId).limit(5),
        supabase.from('meta_campaigns').select('id, campaign_name').eq('brand_id', brandId).limit(5),
        supabase.from('meta_adsets').select('id, adset_name').eq('brand_id', brandId).limit(5)
      ])

      const verification = {
        ad_insights: verificationQueries[0].data?.length || 0,
        demographics: verificationQueries[1].data?.length || 0,
        device_performance: verificationQueries[2].data?.length || 0,
        campaigns: verificationQueries[3].data?.length || 0,
        adsets: verificationQueries[4].data?.length || 0,
        sample_dates: verificationQueries[0].data?.map(r => r.date) || [],
        demo_dates: verificationQueries[1].data?.map(r => r.date_range_start) || []
      }

      console.log(`[NUCLEAR RESET] 📊 VERIFICATION RESULTS:`, verification)

      // Step 6: Run aggregation to rebuild campaign stats
      console.log(`[NUCLEAR RESET] Step 4: 🔄 RUNNING AGGREGATION...`)
      await supabase.rpc('aggregate_meta_data', { brand_id_param: brandId })
      console.log(`[NUCLEAR RESET] ✅ Aggregation complete`)

      // Step 7: Final verification
      const { data: finalCampaigns } = await supabase
        .from('meta_campaigns')
        .select('campaign_name, spent, impressions, reach')
        .eq('brand_id', brandId)

      console.log(`[NUCLEAR RESET] 🎉 FINAL RESULT - Campaigns:`, finalCampaigns)

      return NextResponse.json({
        success: true,
        message: 'NUCLEAR RESET COMPLETE! All Meta data rebuilt successfully.',
        verification,
        campaigns: finalCampaigns,
        sync_result: result,
        steps_completed: [
          '💥 Deleted all old Meta data',
          '🔥 Synced September 1-24 with demographics', 
          '🔍 Verified data storage',
          '🔄 Ran aggregation',
          '🎉 Rebuild complete'
        ]
      })

    } catch (syncError) {
      console.error('[NUCLEAR RESET] ❌ Sync failed:', syncError)
      return NextResponse.json({
        error: 'Sync failed after deletion',
        details: syncError instanceof Error ? syncError.message : 'Unknown sync error',
        step: 'sync_failed',
        note: 'Data was deleted but sync failed. You may need to reconnect Meta.'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('[NUCLEAR RESET] ❌ Critical error:', error)
    return NextResponse.json({ 
      error: 'Nuclear reset failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
