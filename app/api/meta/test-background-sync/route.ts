import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

/**
 * TEST ENDPOINT: Manually trigger the background sync to debug issues
 */
export async function POST(request: NextRequest) {
  try {
    // 🚨 SIMPLIFIED: Check if this is a server-to-server call (no cookies/session)
    const userAgent = request.headers.get('User-Agent') || ''
    const isServerCall = userAgent.includes('node') || request.headers.get('X-Vercel-ID')
    
    console.log(`[Test Background Sync] 🔍 AUTH DEBUG:`)
    console.log(`[Test Background Sync] - User-Agent: ${userAgent}`)
    console.log(`[Test Background Sync] - X-Vercel-ID: ${request.headers.get('X-Vercel-ID') ? 'PRESENT' : 'MISSING'}`)
    console.log(`[Test Background Sync] - isServerCall: ${isServerCall}`)
    
    let userId = null
    if (!isServerCall) {
      console.log(`[Test Background Sync] - Not server call, checking user auth...`)
      const authResult = await auth()
      userId = authResult.userId
      if (!userId) {
        console.log(`[Test Background Sync] - No user ID found, returning 401`)
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    } else {
      console.log(`[Test Background Sync] - Server call detected, proceeding without user auth`)
    }

    const { brandId } = await request.json()
    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID required' }, { status: 400 })
    }

    console.log(`[Test Background Sync] Starting ${isServerCall ? 'SERVER' : 'USER'} sync for brand ${brandId}`)

    const supabase = createClient()

    // Get Meta connection
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')
      .single()

    if (connectionError || !connection?.access_token) {
      return NextResponse.json({ 
        error: 'Meta connection not found or invalid',
        details: connectionError?.message 
      }, { status: 400 })
    }

    console.log(`[Test Background Sync] Found connection:`, {
      id: connection.id,
      hasToken: !!connection.access_token,
      metadata: connection.metadata
    })

    const adAccountId = connection.metadata?.ad_account_id
    if (!adAccountId) {
      return NextResponse.json({ 
        error: 'Ad account ID not found in metadata',
        metadata: connection.metadata 
      }, { status: 400 })
    }

    console.log(`[Test Background Sync] Using ad account: ${adAccountId}`)

    // Import the proven Meta service method
    const { fetchMetaAdInsights } = await import('@/lib/services/meta-service')

    // 🚀 PRODUCTION REQUIREMENT: Full 12-month background queue sync
    console.log(`[Test Background Sync] 🎯 TRIGGERING FULL 12-MONTH QUEUE SYNC FOR PRODUCTION`)
    
    // 🚀 USE EXISTING PROVEN MetaQueueService FOR 12-MONTH SYNC
    const { MetaQueueService } = await import('@/lib/services/metaQueueService')
    
    console.log(`[Test Background Sync] 🔧 Using proven MetaQueueService.queueCompleteHistoricalSync`)
    
    // Get connection details for the queue service
    const result = await MetaQueueService.queueCompleteHistoricalSync(
      brandId,
      connection.id,
      connection.access_token!,
      adAccountId,
      undefined // Let it default to 12 months
    )
    
    console.log(`[Test Background Sync] ✅ Complete historical sync queued:`, result)
    
    // Note: Budget and creative data will be synced by the background queue jobs
    console.log(`[Test Background Sync] 💰🎨 Budget and creative data will be synced by background queue jobs`)
    console.log(`[Test Background Sync] ✅ Immediate sync skipped - background jobs will handle all data types`)
    
    // Return result from the proven queue service
    const insightsResult = {
      success: result.success,
      message: result.success 
        ? `Queued complete 12-month historical sync (${result.totalJobs} jobs including budget/creative data)`
        : `Failed to queue background sync: ${result.estimatedCompletion}`,
      count: result.totalJobs,
      jobsQueued: result.totalJobs > 0 ? Array.from({length: result.totalJobs}, (_, i) => `historical-${i+1}`) : [],
      type: 'proven_queue_service',
      estimatedCompletion: result.estimatedCompletion
    }

    console.log(`[Test Background Sync] Result:`, insightsResult)

    if (insightsResult.success) {
      return NextResponse.json({
        success: true,
        message: 'Full 12-month background sync queued successfully',
        result: insightsResult,
        syncPeriod: {
          from: new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1).toISOString().split('T')[0], // 12 months ago
          to: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0] // End of current month
        },
        queueInfo: {
          totalJobs: result.totalJobs,
          estimatedCompletion: result.estimatedCompletion,
          usingProvenQueueService: true,
          backgroundDataSync: true
        }
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Background queue sync failed',
        details: insightsResult.message || 'Unknown error',
        syncPeriod: {
          from: new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1).toISOString().split('T')[0],
          to: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]
        }
      }, { status: 500 })
    }

  } catch (error) {
    console.error('[Test Background Sync] Error:', error)
    return NextResponse.json({
      error: 'Test background sync failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
