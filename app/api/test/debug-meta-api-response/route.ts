import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { brandId } = await request.json()

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID required' }, { status: 400 })
    }

    console.log(`[Debug Meta API] Testing Meta API response for brand: ${brandId}`)

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

    console.log(`[Debug Meta API] Using account: ${adAccountId}`)

    // Test the EXACT API call that DataBackfillService.fetchMetaDailyInsights makes
    const testRange = {
      since: '2025-08-13',  // 30 days ago
      until: '2025-09-12'   // Today
    }

    // Build the exact URL that fetchMetaDailyInsights uses
    const url = `https://graph.facebook.com/v18.0/${adAccountId}/insights?` +
      `fields=spend,impressions,clicks,date_start,date_stop,actions,action_values,ctr,cpm&` +
      `time_range={"since":"${testRange.since}","until":"${testRange.until}"}&` +
      `time_increment=1&` +  // Daily breakdown
      `access_token=${connection.access_token}`

    console.log(`[Debug Meta API] Making API call:`, url)

    const response = await fetch(url)
    const data = await response.json()

    console.log(`[Debug Meta API] Response status:`, response.status)
    console.log(`[Debug Meta API] Response data:`, JSON.stringify(data, null, 2))

    // Also test WITHOUT time_increment to see if that's the issue
    const urlNoIncrement = `https://graph.facebook.com/v18.0/${adAccountId}/insights?` +
      `fields=spend,impressions,clicks,date_start,date_stop,actions,action_values,ctr,cpm&` +
      `time_range={"since":"${testRange.since}","until":"${testRange.until}"}&` +
      `access_token=${connection.access_token}`

    console.log(`[Debug Meta API] Making API call WITHOUT time_increment:`, urlNoIncrement)

    const responseNoIncrement = await fetch(urlNoIncrement)
    const dataNoIncrement = await responseNoIncrement.json()

    console.log(`[Debug Meta API] Response WITHOUT time_increment:`, JSON.stringify(dataNoIncrement, null, 2))

    return NextResponse.json({
      success: true,
      message: 'Meta API response debugging completed',
      connectionId: connection.id,
      adAccountId,
      testRange,
      apiTests: {
        withTimeIncrement: {
          url,
          status: response.status,
          count: data.data?.length || 0,
          error: data.error?.message || null,
          sample: data.data?.[0] || null,
          allData: data.data || [],
          fullResponse: data
        },
        withoutTimeIncrement: {
          url: urlNoIncrement,
          status: responseNoIncrement.status,
          count: dataNoIncrement.data?.length || 0,
          error: dataNoIncrement.error?.message || null,
          sample: dataNoIncrement.data?.[0] || null,
          fullResponse: dataNoIncrement
        }
      }
    })

  } catch (error) {
    console.error('[Debug Meta API] Error:', error)
    return NextResponse.json({
      error: 'Debug Meta API failed',
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
