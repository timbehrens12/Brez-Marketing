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

    // Extended sync: Last 3 months to avoid timeout but get more data
    const now = new Date()
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0) // End of current month
    const startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1) // Start 3 months ago

    console.log(`[Test Background Sync] Extended sync for 3 months: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`)

    // 🎯 PROVEN METHOD: fetchMetaAdInsights for 3-month period
    const insightsResult = await fetchMetaAdInsights(
      brandId,
      startDate,
      endDate,
      false, // dryRun = false
      false  // skipDemographics = false
    )

    console.log(`[Test Background Sync] Result:`, insightsResult)

    if (insightsResult.success) {
      return NextResponse.json({
        success: true,
        message: 'Extended 3-month sync completed successfully',
        result: insightsResult,
        syncPeriod: {
          from: startDate.toISOString().split('T')[0],
          to: endDate.toISOString().split('T')[0]
        }
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Extended sync failed',
        details: insightsResult.error,
        syncPeriod: {
          from: startDate.toISOString().split('T')[0],
          to: endDate.toISOString().split('T')[0]
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
