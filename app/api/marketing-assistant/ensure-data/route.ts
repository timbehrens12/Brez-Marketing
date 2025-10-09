import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'

/**
 * Ensures COMPLETE and FRESH data exists for the specified date range
 * Always pulls fresh data from Meta API to handle:
 * - Completely missing days
 * - Incomplete days (e.g., synced at 10am, missing rest of day)
 * - Stale data that needs refreshing
 * 
 * This mimics the dashboard's approach of always pulling fresh data
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { brandId, startDate, endDate, platform = 'meta' } = body

    if (!brandId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'brandId, startDate, and endDate are required' },
        { status: 400 }
      )
    }

    console.log(`[Ensure Data] Syncing fresh data for brand ${brandId} from ${startDate} to ${endDate}`)

    // Calculate days between start and end
    const start = new Date(startDate)
    const end = new Date(endDate)
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1

    console.log(`[Ensure Data] Date range covers ${daysDiff} days`)

    // Use Meta resync API to pull fresh data directly from Meta
    // This handles ALL cases: missing days, incomplete days, and stale data
    try {
      const resyncResponse = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/meta/resync`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            brandId,
            days: daysDiff + 7, // Add buffer to ensure we get all data
            refresh_cache: true, // Always refresh - don't use cache
            force_refresh: true  // Force refresh even if recently synced
          })
        }
      )

      if (!resyncResponse.ok) {
        const errorData = await resyncResponse.json()
        console.error('[Ensure Data] Resync failed:', errorData)
        return NextResponse.json({
          success: false,
          message: 'Failed to sync data from Meta',
          syncTriggered: true,
          error: errorData.error || 'Unknown error'
        })
      }

      const resyncResult = await resyncResponse.json()
      console.log(`[Ensure Data] Successfully synced ${resyncResult.count || 0} records from Meta`)
      
      return NextResponse.json({
        success: true,
        message: `Successfully synced ${resyncResult.count || 0} records from Meta for ${daysDiff} days`,
        syncTriggered: true,
        recordCount: resyncResult.count || 0,
        dateRange: { startDate, endDate, days: daysDiff }
      })

    } catch (syncError) {
      console.error('[Ensure Data] Error during Meta resync:', syncError)
      return NextResponse.json({
        success: false,
        message: 'Failed to sync data from Meta',
        syncTriggered: false,
        error: syncError instanceof Error ? syncError.message : 'Unknown error'
      })
    }

  } catch (error) {
    console.error('[Ensure Data] Error:', error)
    return NextResponse.json(
      { error: 'Failed to ensure data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

