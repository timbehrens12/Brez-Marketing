import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const brandId = searchParams.get('brandId')

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID required' }, { status: 400 })
    }

    // Get the active Meta connection
    const supabase = createClient()
    const { data: connection, error: connError } = await supabase
      .from('platform_connections')
      .select('id, access_token')
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')
      .eq('status', 'active')
      .single()

    if (connError || !connection) {
      return NextResponse.json({
        error: 'No active Meta connection found',
        details: connError?.message
      }, { status: 404 })
    }

    console.log(`[Meta Historical Test] Testing with connection: ${connection.id}`)

    // Get account ID
    const accountsResponse = await fetch(`https://graph.facebook.com/v18.0/me/adaccounts?access_token=${connection.access_token}&fields=id,name`)
    const accountsData = await accountsResponse.json()
    const adAccountId = accountsData.data?.[0]?.id

    if (!adAccountId) {
      return NextResponse.json({
        error: 'Failed to get ad account ID',
        response: accountsData
      }, { status: 500 })
    }

    console.log(`[Meta Historical Test] Testing account: ${adAccountId}`)

    // Test different historical date ranges
    const tests = [
      {
        name: 'Last 7 days',
        since: '2024-09-04',
        until: '2024-09-11'
      },
      {
        name: 'Last 30 days', 
        since: '2024-08-12',
        until: '2024-09-11'
      },
      {
        name: 'Last 90 days',
        since: '2024-06-13',
        until: '2024-09-11'
      },
      {
        name: '6 months ago',
        since: '2024-03-12',
        until: '2024-09-11'
      },
      {
        name: '12 months ago',
        since: '2023-09-12',
        until: '2024-09-11'
      }
    ]

    const results = []

    for (const test of tests) {
      console.log(`[Meta Historical Test] Testing ${test.name}: ${test.since} to ${test.until}`)
      
      // Test account-level insights with date range and time_increment=1 for daily data
      const insightsUrl = `https://graph.facebook.com/v18.0/${adAccountId}/insights?` +
        `fields=spend,impressions,clicks,date_start,date_stop&` +
        `time_range={"since":"${test.since}","until":"${test.until}"}&` +
        `time_increment=1&` +  // This requests daily breakdowns
        `access_token=${connection.access_token}&limit=100`
      
      try {
        const insightsResponse = await fetch(insightsUrl)
        const insightsData = await insightsResponse.json()
        
        console.log(`[Meta Historical Test] ${test.name} result:`, {
          count: insightsData.data?.length || 0,
          error: insightsData.error?.message || null
        })

        results.push({
          ...test,
          count: insightsData.data?.length || 0,
          error: insightsData.error?.message || null,
          sample: insightsData.data?.[0] || null
        })

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200))
        
      } catch (error) {
        console.error(`[Meta Historical Test] ${test.name} failed:`, error)
        results.push({
          ...test,
          count: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
          sample: null
        })
      }
    }

    return NextResponse.json({
      success: true,
      adAccountId,
      tests: results,
      summary: {
        totalRecordsFound: results.reduce((sum, r) => sum + r.count, 0),
        longestPeriodWithData: results.find(r => r.count > 0)?.name || 'None',
        recommendations: results.length > 0 ? [
          results.find(r => r.count > 0) ? 
            `✅ Data available for: ${results.filter(r => r.count > 0).map(r => r.name).join(', ')}` :
            '❌ No historical data found - account may be new or have no ad activity'
        ] : []
      }
    })

  } catch (error) {
    console.error('[Meta Historical Test] Error:', error)
    return NextResponse.json({
      error: 'Historical test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
