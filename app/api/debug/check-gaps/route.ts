import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const url = new URL(request.url)
    const brandId = url.searchParams.get('brandId')

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID required' }, { status: 400 })
    }

    // Check Meta ad insights for gaps
    const { data: metaData, error } = await supabase
      .from('meta_ad_insights')
      .select('date_start')
      .eq('brand_id', brandId)
      .gte('date_start', '2025-07-15') // Check last 10 days
      .order('date_start', { ascending: true })

    if (error) {
      console.error('Error fetching Meta data:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Find missing dates
    const existingDates = new Set(metaData?.map(row => row.date_start) || [])
    const missingDates = []
    
    for (let i = 0; i < 10; i++) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      if (!existingDates.has(dateStr)) {
        missingDates.push(dateStr)
      }
    }

    return NextResponse.json({
      success: true,
      brandId,
      existingDates: Array.from(existingDates).sort(),
      missingDates: missingDates.sort(),
      totalMissing: missingDates.length,
      suggestion: missingDates.length > 0 
        ? `Missing ${missingDates.length} days: ${missingDates.join(', ')}`
        : 'No gaps detected in last 10 days'
    })

  } catch (error) {
    console.error('Error checking gaps:', error)
    return NextResponse.json({ 
      error: 'Failed to check gaps',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { brandId, dates } = body

    if (!brandId || !dates || !Array.isArray(dates)) {
      return NextResponse.json({ error: 'Brand ID and dates array required' }, { status: 400 })
    }

    console.log(`[Debug Backfill] Manual backfill requested for brand ${brandId}, dates: ${dates.join(', ')}`)

    // Call the Meta sync API for each missing date
    const results = []
    for (const dateStr of dates) {
      try {
        console.log(`[Debug Backfill] Syncing data for ${dateStr}`)
        
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/meta/sync-insights`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            brandId,
            startDate: dateStr,
            endDate: dateStr,
            force: true
          })
        })

        if (response.ok) {
          const data = await response.json()
          results.push({ date: dateStr, success: true, count: data.count || 0 })
          console.log(`[Debug Backfill] ✅ ${dateStr}: ${data.count || 0} records`)
        } else {
          const errorText = await response.text()
          results.push({ date: dateStr, success: false, error: errorText })
          console.log(`[Debug Backfill] ❌ ${dateStr}: ${errorText}`)
        }
      } catch (error) {
        results.push({ date: dateStr, success: false, error: error instanceof Error ? error.message : 'Unknown error' })
        console.log(`[Debug Backfill] ❌ ${dateStr}: ${error}`)
      }
    }

    const successful = results.filter(r => r.success)
    const failed = results.filter(r => !r.success)

    return NextResponse.json({
      success: true,
      message: `Backfill completed: ${successful.length} successful, ${failed.length} failed`,
      results,
      totalRecords: successful.reduce((sum, r) => sum + (r.count || 0), 0)
    })

  } catch (error) {
    console.error('Error in manual backfill:', error)
    return NextResponse.json({ 
      error: 'Failed to perform backfill',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 