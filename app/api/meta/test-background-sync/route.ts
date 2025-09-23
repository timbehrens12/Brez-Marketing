import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

/**
 * TEST ENDPOINT: Manually trigger the background sync to debug issues
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

    console.log(`[Test Background Sync] Starting manual test for brand ${brandId}`)

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

    // Test with just one month (current month)
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    console.log(`[Test Background Sync] Testing sync for ${monthStart.toISOString().split('T')[0]} to ${monthEnd.toISOString().split('T')[0]}`)

    // 🎯 PROVEN METHOD: fetchMetaAdInsights for current month
    const insightsResult = await fetchMetaAdInsights(
      brandId,
      monthStart,
      monthEnd,
      false, // dryRun = false
      false  // skipDemographics = false
    )

    console.log(`[Test Background Sync] Result:`, insightsResult)

    if (insightsResult.success) {
      return NextResponse.json({
        success: true,
        message: 'Background sync test completed successfully',
        result: insightsResult,
        testPeriod: {
          from: monthStart.toISOString().split('T')[0],
          to: monthEnd.toISOString().split('T')[0]
        }
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Background sync test failed',
        details: insightsResult.error,
        testPeriod: {
          from: monthStart.toISOString().split('T')[0],
          to: monthEnd.toISOString().split('T')[0]
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
