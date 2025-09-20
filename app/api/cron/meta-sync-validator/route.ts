import { NextRequest, NextResponse } from 'next/server'
import { metaSyncValidator } from '@/lib/services/meta-sync-validator'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

/**
 * Cron job to automatically validate and fix stale Meta campaign data
 * 
 * This runs periodically to prevent $0 budget issues and 404 campaign errors
 * by detecting deleted campaigns and cleaning up stale database entries.
 * 
 * Should be called by Vercel Cron or similar scheduler every 30 minutes.
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[Cron Meta Sync] Starting automatic sync validation...')
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    // Get all brands with active Meta connections
    const { data: connections, error: connectionsError } = await supabase
      .from('platform_connections')
      .select('brand_id, id, access_token, metadata')
      .eq('platform_type', 'meta')
      .eq('status', 'active')
    
    if (connectionsError) {
      console.error('[Cron Meta Sync] Error fetching connections:', connectionsError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch Meta connections',
        processed: 0
      }, { status: 500 })
    }

    if (!connections || connections.length === 0) {
      console.log('[Cron Meta Sync] No active Meta connections found')
      return NextResponse.json({
        success: true,
        message: 'No active Meta connections to validate',
        processed: 0
      })
    }

    console.log(`[Cron Meta Sync] Found ${connections.length} active Meta connections`)

    const results = []
    let successCount = 0
    let errorCount = 0

    // Process each brand's Meta connection
    for (const connection of connections) {
      try {
        console.log(`[Cron Meta Sync] Processing brand ${connection.brand_id}`)
        
        const syncResult = await metaSyncValidator.checkAndAutoSync(connection.brand_id)
        
        results.push({
          brandId: connection.brand_id,
          success: syncResult.success,
          message: syncResult.message,
          syncTriggered: syncResult.syncTriggered
        })

        if (syncResult.success) {
          successCount++
          if (syncResult.syncTriggered) {
            console.log(`[Cron Meta Sync] ✅ Brand ${connection.brand_id}: ${syncResult.message}`)
          }
        } else {
          errorCount++
          console.error(`[Cron Meta Sync] ❌ Brand ${connection.brand_id}: ${syncResult.message}`)
        }

        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (error) {
        errorCount++
        console.error(`[Cron Meta Sync] Error processing brand ${connection.brand_id}:`, error)
        results.push({
          brandId: connection.brand_id,
          success: false,
          message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          syncTriggered: false
        })
      }
    }

    const summary = {
      success: errorCount === 0,
      processed: connections.length,
      successful: successCount,
      errors: errorCount,
      timestamp: new Date().toISOString(),
      results: results.filter(r => r.syncTriggered) // Only show results where sync was triggered
    }

    console.log(`[Cron Meta Sync] Completed - Processed: ${summary.processed}, Successful: ${summary.successful}, Errors: ${summary.errors}`)

    return NextResponse.json(summary)

  } catch (error) {
    console.error('[Cron Meta Sync] Fatal error:', error)
    return NextResponse.json({
      success: false,
      error: 'Cron job failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      processed: 0
    }, { status: 500 })
  }
}

/**
 * Allow manual triggering via POST for testing
 */
export async function POST(request: NextRequest) {
  // Extract specific brandId if provided for manual testing
  const body = await request.json().catch(() => ({}))
  const { brandId } = body

  try {
    if (brandId) {
      console.log(`[Manual Meta Sync] Processing specific brand ${brandId}`)
      const syncResult = await metaSyncValidator.checkAndAutoSync(brandId)
      
      return NextResponse.json({
        success: syncResult.success,
        message: syncResult.message,
        syncTriggered: syncResult.syncTriggered,
        brandId: brandId
      })
    } else {
      // Run full cron job
      return await GET(request)
    }
  } catch (error) {
    console.error('[Manual Meta Sync] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
