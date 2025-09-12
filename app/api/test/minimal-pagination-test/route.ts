import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { brandId } = await request.json()

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID required' }, { status: 400 })
    }

    console.log(`[Minimal Pagination Test] Testing pagination for brand: ${brandId}`)

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

    // Test pagination WITHOUT storing to database
    const dateRange = {
      since: '2025-08-13',
      until: '2025-09-12'
    }

    let insightsUrl = `https://graph.facebook.com/v18.0/${adAccountId}/insights?` +
      `fields=spend,impressions,clicks,date_start,date_stop&` +
      `time_range={"since":"${dateRange.since}","until":"${dateRange.until}"}&` +
      `time_increment=1&` +
      `access_token=${connection.access_token}&limit=25`

    console.log(`[Minimal Pagination Test] Starting URL: ${insightsUrl}`)

    let allInsights: any[] = []
    let nextUrl = insightsUrl
    let pageCount = 0
    let pages: any[] = []
    
    while (nextUrl && pageCount < 5) { // Limit to 5 pages for testing
      pageCount++
      console.log(`[Minimal Pagination Test] Fetching page ${pageCount}...`)
      
      const response = await fetch(nextUrl)
      const data = await response.json()

      const pageInfo = {
        pageNumber: pageCount,
        status: response.status,
        recordCount: data.data?.length || 0,
        error: data.error?.message || null,
        hasNext: !!data.paging?.next,
        nextUrl: data.paging?.next || null,
        sample: data.data?.[0] || null
      }

      pages.push(pageInfo)
      console.log(`[Minimal Pagination Test] Page ${pageCount} info:`, pageInfo)

      if (data.error) {
        console.error(`[Minimal Pagination Test] Error on page ${pageCount}:`, data.error)
        break
      }

      if (data.data && data.data.length > 0) {
        allInsights.push(...data.data)
        console.log(`[Minimal Pagination Test] Added ${data.data.length} insights from page ${pageCount}. Total: ${allInsights.length}`)
      }

      // Check for next page
      nextUrl = data.paging?.next || null
      if (!nextUrl) {
        console.log(`[Minimal Pagination Test] No more pages. Finished with ${pageCount} pages.`)
        break
      }
    }

    console.log(`[Minimal Pagination Test] PAGINATION COMPLETE! Total insights: ${allInsights.length} across ${pageCount} pages`)

    return NextResponse.json({
      success: true,
      message: 'Minimal pagination test completed',
      connectionId: connection.id,
      adAccountId,
      dateRange,
      pagination: {
        totalPages: pageCount,
        totalInsights: allInsights.length,
        pages,
        sampleInsight: allInsights[0] || null,
        dateRangeActual: allInsights.length > 0 ? {
          earliest: allInsights[allInsights.length - 1]?.date_start,
          latest: allInsights[0]?.date_start
        } : null
      }
    })

  } catch (error) {
    console.error('[Minimal Pagination Test] Error:', error)
    return NextResponse.json({
      error: 'Minimal pagination test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const brandId = url.searchParams.get('brandId')
  
  if (!brandId) {
    return NextResponse.json({ error: 'Brand ID required' }, { status: 400 })
  }

  return POST(new NextRequest(request.url, {
    method: 'POST',
    body: JSON.stringify({ brandId }),
    headers: { 'content-type': 'application/json' }
  }))
}
