import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get the Meta connection
    const { data: connection, error } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('brand_id', '0da80e8f-2df3-468d-9053-08fa4d24e6e8')
      .eq('platform_type', 'meta')
      .single()

    if (error || !connection) {
      return NextResponse.json({ error: 'No Meta connection found' }, { status: 404 })
    }

    // Test multiple date ranges
    const ranges = [
      { name: 'Last 7 days', since: '2025-09-03', until: '2025-09-10' },
      { name: 'Last 30 days', since: '2025-08-11', until: '2025-09-10' },
      { name: 'Last 90 days', since: '2025-06-12', until: '2025-09-10' },
      { name: 'Since March', since: '2025-03-01', until: '2025-09-10' },
      { name: 'All 2025', since: '2025-01-01', until: '2025-09-10' },
    ]

    const results = []

    for (const range of ranges) {
      console.log(`[Debug Meta] Testing range: ${range.name} (${range.since} to ${range.until})`)
      
      const url = `https://graph.facebook.com/v18.0/act_498473601902770/insights?fields=account_id,account_name,campaign_id,campaign_name,ad_id,ad_name,impressions,clicks,spend,reach,date_start,date_stop&level=ad&time_range={"since":"${range.since}","until":"${range.until}"}&time_increment=1&access_token=${connection.access_token}`
      
      try {
        const response = await fetch(url)
        const data = await response.json()
        
        if (data.error) {
          results.push({
            range: range.name,
            dateRange: `${range.since} to ${range.until}`,
            error: data.error,
            success: false
          })
        } else {
          const dataCount = data.data ? data.data.length : 0
          const dates = data.data ? data.data.map((item: any) => item.date_start) : []
          const uniqueDates = [...new Set(dates)].sort()
          const totalSpend = data.data ? data.data.reduce((sum: number, item: any) => sum + parseFloat(item.spend || 0), 0) : 0
          
          results.push({
            range: range.name,
            dateRange: `${range.since} to ${range.until}`,
            success: true,
            recordCount: dataCount,
            uniqueDates: uniqueDates.length,
            dateSpan: uniqueDates.length > 0 ? `${uniqueDates[0]} to ${uniqueDates[uniqueDates.length - 1]}` : 'No dates',
            totalSpend: totalSpend.toFixed(2),
            sampleDates: uniqueDates.slice(0, 10)
          })
        }
        
        // Add delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000))
        
      } catch (fetchError) {
        results.push({
          range: range.name,
          dateRange: `${range.since} to ${range.until}`,
          error: `Fetch error: ${fetchError}`,
          success: false
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Meta API date range test completed',
      results,
      summary: {
        totalRangesTested: ranges.length,
        successfulRanges: results.filter(r => r.success).length,
        failedRanges: results.filter(r => !r.success).length
      }
    })

  } catch (error) {
    console.error('[Debug Meta] Error:', error)
    return NextResponse.json({ 
      error: 'Debug test failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
