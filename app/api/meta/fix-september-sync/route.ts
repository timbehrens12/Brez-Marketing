import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

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

    console.log(`[Fix September Sync] Starting comprehensive September sync for user ${userId}`)

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get brand ID from request or use the latest Meta connection
    const { data: connections } = await supabase
      .from('platform_connections')
      .select('brand_id, id, metadata')
      .eq('user_id', userId)
      .eq('platform_type', 'meta')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)

    if (!connections || connections.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No active Meta connection found' },
        { status: 404 }
      )
    }

    const brandId = connections[0].brand_id
    const connectionId = connections[0].id
    const accountId = connections[0].metadata?.ad_account_id

    console.log(`[Fix September Sync] Found brand ${brandId}, connection ${connectionId}, account ${accountId}`)

    // Import the Meta service
    const { fetchMetaAdInsights } = await import('@/lib/services/meta-service')

    // NUCLEAR FIX: Sync the COMPLETE September month with proper chunking
    console.log(`[Fix September Sync] 🚀 NUCLEAR: Syncing COMPLETE September 1-24 with all demographics`)

    try {
      // Strategy 1: Try full month sync (Sept 1-24)
      let syncSuccess = false
      
      try {
        console.log(`[Fix September Sync] 📅 Attempting full September sync (1-24)...`)
        await fetchMetaAdInsights(brandId, new Date('2025-09-01'), new Date('2025-09-24'), false, false)
        syncSuccess = true
        console.log(`[Fix September Sync] ✅ COMPLETE September sync successful!`)
      } catch (fullError) {
        console.warn(`[Fix September Sync] ⚠️ Full month sync failed, trying weekly chunks:`, fullError)
        
        // Strategy 2: Weekly chunks
        const weeklyChunks = [
          { start: new Date('2025-09-01'), end: new Date('2025-09-07'), name: 'Week 1' },
          { start: new Date('2025-09-08'), end: new Date('2025-09-14'), name: 'Week 2' },
          { start: new Date('2025-09-15'), end: new Date('2025-09-21'), name: 'Week 3' },
          { start: new Date('2025-09-22'), end: new Date('2025-09-24'), name: 'Week 4' }
        ]
        
        for (const chunk of weeklyChunks) {
          try {
            console.log(`[Fix September Sync] 📅 Syncing ${chunk.name} (${chunk.start.getDate()}-${chunk.end.getDate()})...`)
            await fetchMetaAdInsights(brandId, chunk.start, chunk.end, false, false)
            console.log(`[Fix September Sync] ✅ ${chunk.name} sync successful`)
            syncSuccess = true
            
            // Small delay between chunks
            await new Promise(resolve => setTimeout(resolve, 1000))
          } catch (chunkError) {
            console.error(`[Fix September Sync] ❌ ${chunk.name} sync failed:`, chunkError)
          }
        }
      }

      if (!syncSuccess) {
        console.error(`[Fix September Sync] ❌ ALL sync strategies failed`)
        return NextResponse.json(
          { success: false, error: 'All September sync strategies failed' },
          { status: 500 }
        )
      }

      // Force aggregation to ensure all tables are populated
      console.log(`[Fix September Sync] 🔄 Forcing data aggregation...`)
      await supabase.rpc('aggregate_meta_data', { brand_id_param: brandId })
      console.log(`[Fix September Sync] ✅ Data aggregation completed`)

      // Final verification
      const finalChecks = await Promise.all([
        supabase.from('meta_ad_insights').select('count(*)').eq('brand_id', brandId).gte('date', '2025-09-01').lte('date', '2025-09-24').single(),
        supabase.from('meta_demographics').select('count(*)').eq('brand_id', brandId).gte('date_range_start', '2025-09-01').lte('date_range_start', '2025-09-24').single(),
        supabase.from('meta_device_performance').select('count(*)').eq('brand_id', brandId).gte('date_range_start', '2025-09-01').lte('date_range_start', '2025-09-24').single(),
      ])

      const [sepInsights, sepDemo, sepDevice] = finalChecks.map(c => c.data?.count || 0)

      console.log(`[Fix September Sync] 🎉 FINAL SEPTEMBER COUNTS: insights=${sepInsights}, demographics=${sepDemo}, device=${sepDevice}`)

      return NextResponse.json({
        success: true,
        message: 'September sync completed successfully',
        data: {
          brandId,
          september_insights: sepInsights,
          september_demographics: sepDemo,
          september_device: sepDevice
        }
      })

    } catch (error) {
      console.error('[Fix September Sync] Critical error:', error)
      return NextResponse.json(
        { success: false, error: 'September sync failed', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('[Fix September Sync] API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
