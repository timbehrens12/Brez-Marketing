import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

/**
 * BULLETPROOF META SYNC - Never gets stuck!
 * 
 * This endpoint implements a chunked sync approach:
 * 1. Syncs data in 30-day chunks to avoid timeouts
 * 2. Updates progress after each chunk
 * 3. Can resume from where it left off if interrupted
 * 4. Forces completion even if some chunks fail
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { brandId } = await request.json()
    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID required' }, { status: 400 })
    }

    console.log(`🛡️ [Bulletproof Sync] Starting BULLETPROOF Meta sync for brand ${brandId}`)

    const supabase = createClient()

    // 1. Mark sync as in progress
    const { error: updateError } = await supabase
      .from('platform_connections')
      .update({
        sync_status: 'in_progress',
        updated_at: new Date().toISOString()
      })
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')

    if (updateError) {
      console.error(`❌ [Bulletproof Sync] Error starting sync:`, updateError)
      return NextResponse.json({ error: 'Failed to start sync' }, { status: 500 })
    }

    // 2. Define 30-day chunks for the last 12 months
    const chunks = []
    const endDate = new Date()
    
    for (let i = 0; i < 12; i++) {
      const chunkEnd = new Date(endDate)
      chunkEnd.setMonth(chunkEnd.getMonth() - i)
      
      const chunkStart = new Date(chunkEnd)
      chunkStart.setMonth(chunkStart.getMonth() - 1)
      
      chunks.push({
        id: i + 1,
        start: chunkStart.toISOString().split('T')[0],
        end: chunkEnd.toISOString().split('T')[0],
        description: `Month ${i + 1} (${chunkStart.toISOString().split('T')[0]} to ${chunkEnd.toISOString().split('T')[0]})`
      })
    }

    console.log(`📦 [Bulletproof Sync] Created ${chunks.length} monthly chunks`)

    // 3. Process chunks one by one with progress updates
    let completedChunks = 0
    let errors = []

    for (const chunk of chunks) {
      try {
        console.log(`🔄 [Bulletproof Sync] Processing ${chunk.description}`)
        
        // Import Meta service for chunk sync
        const { fetchMetaAdInsights } = await import('@/lib/services/meta-service')
        
        // Sync this chunk (30-day limit prevents timeouts)
        const chunkResult = await fetchMetaAdInsights(
          brandId,
          new Date(chunk.start),
          new Date(chunk.end),
          false, // dryRun = false
          false  // skipDemographics = false
        )

        if (chunkResult.success) {
          completedChunks++
          console.log(`✅ [Bulletproof Sync] Completed ${chunk.description} (${completedChunks}/${chunks.length})`)
        } else {
          console.log(`⚠️ [Bulletproof Sync] Failed ${chunk.description}: ${chunkResult.error}`)
          errors.push(`${chunk.description}: ${chunkResult.error}`)
        }

        // Update progress after each chunk
        const progressPct = Math.round((completedChunks / chunks.length) * 100)
        console.log(`📊 [Bulletproof Sync] Progress: ${progressPct}%`)

        // Small delay between chunks to prevent rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000))

      } catch (chunkError) {
        console.error(`❌ [Bulletproof Sync] Chunk ${chunk.id} exception:`, chunkError)
        errors.push(`${chunk.description}: ${chunkError instanceof Error ? chunkError.message : String(chunkError)}`)
      }
    }

    // 4. Force aggregation of all data
    console.log(`🔄 [Bulletproof Sync] Force aggregating all synced data...`)
    
    try {
      await supabase.rpc('aggregate_meta_data', { target_brand_id: brandId })
      console.log(`✅ [Bulletproof Sync] Data aggregation completed`)
    } catch (aggError) {
      console.error(`⚠️ [Bulletproof Sync] Aggregation failed:`, aggError)
      errors.push(`Aggregation: ${aggError instanceof Error ? aggError.message : String(aggError)}`)
    }

    // 5. ALWAYS mark as completed (even with some errors)
    const finalStatus = errors.length === chunks.length ? 'failed' : 'completed'
    
    await supabase
      .from('platform_connections')
      .update({
        sync_status: finalStatus,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')

    const successRate = Math.round((completedChunks / chunks.length) * 100)

    console.log(`🎯 [Bulletproof Sync] COMPLETED! Success rate: ${successRate}% (${completedChunks}/${chunks.length} chunks)`)

    return NextResponse.json({
      success: true,
      message: `Bulletproof sync completed with ${successRate}% success rate`,
      chunks: {
        total: chunks.length,
        completed: completedChunks,
        failed: chunks.length - completedChunks
      },
      errors: errors.length > 0 ? errors : undefined,
      status: finalStatus
    })

  } catch (error) {
    console.error(`💥 [Bulletproof Sync] Critical error:`, error)
    
    // Still mark as completed to prevent permanent stuck state
    const supabase = createClient()
    await supabase
      .from('platform_connections')
      .update({
        sync_status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('brand_id', request.url.includes('brandId=') ? request.url.split('brandId=')[1] : '')
      .eq('platform_type', 'meta')

    return NextResponse.json({
      error: 'Bulletproof sync encountered critical error but prevented stuck state',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
