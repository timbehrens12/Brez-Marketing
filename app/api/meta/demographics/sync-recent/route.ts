import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

/**
 * Force sync recent demographics data for a brand
 * This endpoint triggers a demographics sync for the last 30 days
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const brandId = searchParams.get('brandId')
    
    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID required' }, { status: 400 })
    }

    console.log(`[Demographics Sync] Triggering recent demographics sync for brand ${brandId}`)

    // Calculate date range for last 30 days
    const today = new Date()
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const dateFrom = thirtyDaysAgo.toISOString().split('T')[0]
    const dateTo = today.toISOString().split('T')[0]

    console.log(`[Demographics Sync] Syncing demographics from ${dateFrom} to ${dateTo}`)

    // Trigger the demographics sync by calling the test endpoint
    const syncUrl = `${request.nextUrl.origin}/api/test/demographics-sync?brandId=${brandId}&dateFrom=${dateFrom}&dateTo=${dateTo}&forceSync=true`
    
    const syncResponse = await fetch(syncUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    })

    const syncResult = await syncResponse.json()

    if (syncResponse.ok) {
      return NextResponse.json({
        success: true,
        message: 'Demographics sync triggered successfully',
        dateRange: { from: dateFrom, to: dateTo },
        syncResult
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Failed to trigger demographics sync',
        details: syncResult
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Demographics sync error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}
