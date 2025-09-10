import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    // Hardcode the brand ID for easy testing
    const brandId = '0da80e8f-2df3-468d-9053-08fa4d24e6e8'

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get Meta connection
    const { data: connection, error } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')
      .single()

    if (error || !connection) {
      return NextResponse.json({ error: 'No Meta connection found' }, { status: 404 })
    }

    // Test different date ranges
    const ranges = [
      { name: 'Last 30 days', since: '2025-08-11', until: '2025-09-10' },
      { name: 'Since March', since: '2025-03-01', until: '2025-09-10' },
      { name: 'All 2025', since: '2025-01-01', until: '2025-09-10' }
    ]

    const results = []
    const accountId = connection.metadata?.ad_account_id || 'act_498473601902770'

    for (const range of ranges) {
      const url = `https://graph.facebook.com/v18.0/${accountId}/insights?fields=account_id,campaign_id,campaign_name,ad_id,ad_name,impressions,clicks,spend,reach,date_start,date_stop&level=ad&time_range={"since":"${range.since}","until":"${range.until}"}&time_increment=1&access_token=${connection.access_token}`
      
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
          const records = data.data || []
          const dates = records.map((item: any) => item.date_start)
          const uniqueDates = [...new Set(dates)].sort()
          const totalSpend = records.reduce((sum: number, item: any) => sum + parseFloat(item.spend || 0), 0)
          
          results.push({
            range: range.name,
            dateRange: `${range.since} to ${range.until}`,
            success: true,
            recordCount: records.length,
            uniqueDates: uniqueDates.length,
            dateSpan: uniqueDates.length > 0 ? `${uniqueDates[0]} to ${uniqueDates[uniqueDates.length - 1]}` : 'No dates',
            totalSpend: totalSpend.toFixed(2),
            sampleDates: uniqueDates.slice(0, 5)
          })
        }
        
        // Delay to avoid rate limits
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
      brandId,
      accountId,
      results,
      message: 'Emergency Meta API test completed'
    })

  } catch (error) {
    console.error('[Emergency Meta] Error:', error)
    return NextResponse.json({ 
      error: 'Emergency test failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
