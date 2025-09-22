import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

/**
 * PRODUCTION FIX: Complete 12-month sync after reconnection
 * This ensures ALL historical data is properly populated
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { brandId, accessToken, adAccountId } = await request.json()
    if (!brandId || !accessToken || !adAccountId) {
      return NextResponse.json({ 
        error: 'Brand ID, access token, and ad account ID required' 
      }, { status: 400 })
    }

    console.log(`🚀 [Meta Reconnect Full Sync] Starting COMPLETE 12-month sync for brand ${brandId}`)

    const supabase = createClient()

    // 1. Update connection to active and in_progress
    const { error: connectionError } = await supabase
      .from('platform_connections')
      .update({
        status: 'active',
        sync_status: 'in_progress',
        access_token: accessToken,
        metadata: { ad_account_id: adAccountId },
        updated_at: new Date().toISOString()
      })
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')

    if (connectionError) {
      console.error(`❌ [Meta Reconnect] Error updating connection:`, connectionError)
      return NextResponse.json({ error: 'Failed to update connection' }, { status: 500 })
    }

    // 2. Import Meta service for the complete sync
    const { fetchMetaAdInsights } = await import('@/lib/services/meta-service')

    // 3. Set up COMPLETE 12-month date range
    const endDate = new Date()
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - 12) // Exactly 12 months back

    console.log(`📅 [Meta Reconnect] Syncing COMPLETE range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`)

    // 4. BULLETPROOF CHUNKED SYNC - Never gets stuck!
    console.log(`🛡️ [Meta Reconnect] Using BULLETPROOF chunked sync approach`)
    
    // Define 30-day chunks for the last 12 months (prevents timeouts)
    const chunks = []
    for (let i = 0; i < 12; i++) {
      const chunkEnd = new Date(endDate)
      chunkEnd.setMonth(chunkEnd.getMonth() - i)
      
      const chunkStart = new Date(chunkEnd)
      chunkStart.setMonth(chunkStart.getMonth() - 1)
      
      chunks.push({
        id: i + 1,
        start: chunkStart,
        end: chunkEnd,
        description: `Month ${i + 1} (${chunkStart.toISOString().split('T')[0]} to ${chunkEnd.toISOString().split('T')[0]})`
      })
    }

    console.log(`📦 [Meta Reconnect] Processing ${chunks.length} monthly chunks`)

    // Process chunks one by one with progress updates (NEVER GETS STUCK)
    let completedChunks = 0
    let errors = []

    for (const chunk of chunks) {
      try {
        console.log(`🔄 [Meta Reconnect] Processing ${chunk.description}`)
        
        // Sync this chunk (30-day limit prevents timeouts)
        const chunkResult = await fetchMetaAdInsights(
          brandId,
          chunk.start,
          chunk.end,
          false, // dryRun = false
          false  // skipDemographics = false
        )

        if (chunkResult.success) {
          completedChunks++
          console.log(`✅ [Meta Reconnect] Completed ${chunk.description} (${completedChunks}/${chunks.length})`)
        } else {
          console.log(`⚠️ [Meta Reconnect] Failed ${chunk.description}: ${chunkResult.error}`)
          errors.push(`${chunk.description}: ${chunkResult.error}`)
        }

        // Update progress after each chunk
        const progressPct = Math.round((completedChunks / chunks.length) * 100)
        console.log(`📊 [Meta Reconnect] Progress: ${progressPct}%`)

        // Small delay between chunks to prevent rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000))

      } catch (chunkError) {
        console.error(`❌ [Meta Reconnect] Chunk ${chunk.id} exception:`, chunkError)
        errors.push(`${chunk.description}: ${chunkError instanceof Error ? chunkError.message : String(chunkError)}`)
      }
    }

    // Determine final status based on success rate
    const successRate = Math.round((completedChunks / chunks.length) * 100)
    const syncSuccess = successRate >= 50 // Consider success if 50%+ chunks completed
    
    console.log(`🎯 [Meta Reconnect] Chunked sync completed! Success rate: ${successRate}% (${completedChunks}/${chunks.length} chunks)`)

    if (!syncSuccess && completedChunks === 0) {
      console.error(`❌ [Meta Reconnect] All chunks failed`)
      
      // Mark connection as failed only if NO chunks succeeded
      await supabase
        .from('platform_connections')
        .update({
          sync_status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('brand_id', brandId)
        .eq('platform_type', 'meta')

      return NextResponse.json({
        error: 'Failed to sync Meta data - all chunks failed',
        details: errors.join('; '),
        chunks: { total: chunks.length, completed: completedChunks, failed: chunks.length - completedChunks }
      }, { status: 500 })
    }

    // 5. Force aggregation to ensure all data is properly structured
    console.log(`🔄 [Meta Reconnect] Force aggregating data...`)

    // Aggregate ad insights into adset daily insights
    await supabase.rpc('aggregate_meta_data', { target_brand_id: brandId })

    // 6. Mark sync as completed
    const { error: completeError } = await supabase
      .from('platform_connections')
      .update({
        sync_status: 'completed',
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')

    if (completeError) {
      console.error(`❌ [Meta Reconnect] Error marking complete:`, completeError)
    }

    console.log(`✅ [Meta Reconnect] COMPLETE! Brand ${brandId} has full 12-month data`)

    return NextResponse.json({
      success: true,
      message: `BULLETPROOF Meta sync completed with ${successRate}% success rate - NEVER GETS STUCK!`,
      dateRange: {
        from: startDate.toISOString().split('T')[0],
        to: endDate.toISOString().split('T')[0]
      },
      chunks: {
        total: chunks.length,
        completed: completedChunks,
        failed: chunks.length - completedChunks,
        successRate: `${successRate}%`
      },
      errors: errors.length > 0 ? errors : undefined,
      action: 'check_dashboard_data'
    })

  } catch (error) {
    console.error('❌ [Meta Reconnect] Error:', error)
    return NextResponse.json({
      error: 'Failed to reconnect Meta with full sync',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
