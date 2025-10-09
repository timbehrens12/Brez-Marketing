import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Ensures data exists for the specified date range
 * Checks for gaps in daily data and triggers sync if needed
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

    console.log(`[Ensure Data] Checking data for brand ${brandId} from ${startDate} to ${endDate}`)

    // Get all dates in the range
    const dateRange = getDateRange(startDate, endDate)
    console.log(`[Ensure Data] Expected ${dateRange.length} days of data`)

    // Check which dates have data
    const { data: existingData } = await supabase
      .from('meta_campaign_daily_stats')
      .select('date')
      .eq('brand_id', brandId)
      .gte('date', startDate)
      .lte('date', endDate)

    const existingDates = new Set(existingData?.map(d => d.date) || [])
    const missingDates = dateRange.filter(date => !existingDates.has(date))

    console.log(`[Ensure Data] Found data for ${existingDates.size} days`)
    console.log(`[Ensure Data] Missing data for ${missingDates.length} days:`, missingDates)

    if (missingDates.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All data present',
        missingDates: [],
        syncTriggered: false
      })
    }

    // Get Meta connection for this brand
    const { data: connection } = await supabase
      .from('platform_connections')
      .select('id, access_token, ad_account_id')
      .eq('brand_id', brandId)
      .eq('platform', 'meta')
      .eq('status', 'connected')
      .single()

    if (!connection) {
      console.log(`[Ensure Data] No Meta connection found for brand ${brandId}`)
      return NextResponse.json({
        success: false,
        message: 'No Meta connection found',
        missingDates,
        syncTriggered: false
      })
    }

    // Trigger backfill for missing dates
    console.log(`[Ensure Data] Triggering backfill for ${missingDates.length} missing dates`)
    
    try {
      const backfillResponse = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/meta/sync-daily-stats`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            brandId,
            connectionId: connection.id,
            startDate: missingDates[0], // Earliest missing date
            endDate: missingDates[missingDates.length - 1], // Latest missing date
            force: true // Force sync even if recently synced
          })
        }
      )

      const backfillResult = await backfillResponse.json()
      
      return NextResponse.json({
        success: true,
        message: `Triggered backfill for ${missingDates.length} missing dates`,
        missingDates,
        syncTriggered: true,
        syncResult: backfillResult
      })
    } catch (syncError) {
      console.error('[Ensure Data] Error triggering sync:', syncError)
      return NextResponse.json({
        success: false,
        message: 'Failed to trigger sync',
        missingDates,
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

/**
 * Generate array of dates between start and end (inclusive)
 */
function getDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = []
  const current = new Date(startDate)
  const end = new Date(endDate)

  while (current <= end) {
    dates.push(current.toISOString().split('T')[0])
    current.setDate(current.getDate() + 1)
  }

  return dates
}

