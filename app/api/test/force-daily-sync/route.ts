import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { brandId } = await request.json()

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID required' }, { status: 400 })
    }

    console.log(`[Force Daily Sync] Starting DAILY BREAKDOWN sync for brand: ${brandId}`)

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

    console.log(`[Force Daily Sync] Using account: ${adAccountId}`)

    // Test different date ranges with DAILY BREAKDOWN
    const tests = []

    // Test 1: Last 30 days with daily breakdown
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const today = new Date()
    
    const url30Days = `https://graph.facebook.com/v18.0/${adAccountId}/insights?` +
      `fields=spend,impressions,clicks,date_start,date_stop&` +
      `time_range={"since":"${thirtyDaysAgo.toISOString().split('T')[0]}","until":"${today.toISOString().split('T')[0]}"}&` +
      `time_increment=1&` +  // DAILY BREAKDOWN
      `access_token=${connection.access_token}&limit=100`

    console.log(`[Force Daily Sync] Testing 30-day daily breakdown...`)
    console.log(`[Force Daily Sync] URL: ${url30Days}`)
    
    const response30 = await fetch(url30Days)
    const data30 = await response30.json()
    
    tests.push({
      name: "Last 30 days with daily breakdown",
      url: url30Days,
      count: data30.data?.length || 0,
      error: data30.error?.message || null,
      sample: data30.data?.[0] || null,
      allData: data30.data || []
    })

    // Test 2: Last 90 days with daily breakdown  
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
    
    const url90Days = `https://graph.facebook.com/v18.0/${adAccountId}/insights?` +
      `fields=spend,impressions,clicks,date_start,date_stop&` +
      `time_range={"since":"${ninetyDaysAgo.toISOString().split('T')[0]}","until":"${today.toISOString().split('T')[0]}"}&` +
      `time_increment=1&` +  // DAILY BREAKDOWN
      `access_token=${connection.access_token}&limit=200`

    console.log(`[Force Daily Sync] Testing 90-day daily breakdown...`)
    
    const response90 = await fetch(url90Days)
    const data90 = await response90.json()
    
    tests.push({
      name: "Last 90 days with daily breakdown",
      count: data90.data?.length || 0,
      error: data90.error?.message || null,
      sample: data90.data?.[0] || null,
      fullResponse: data90
    })

    // Test 3: March 2025 to now with daily breakdown
    const url6Months = `https://graph.facebook.com/v18.0/${adAccountId}/insights?` +
      `fields=spend,impressions,clicks,date_start,date_stop&` +
      `time_range={"since":"2025-03-01","until":"2025-09-12"}&` +
      `time_increment=1&` +  // DAILY BREAKDOWN
      `access_token=${connection.access_token}&limit=300`

    console.log(`[Force Daily Sync] Testing March-Sept 2025 daily breakdown...`)
    
    const response6 = await fetch(url6Months)
    const data6 = await response6.json()
    
    tests.push({
      name: "March 2025 to Sept 2025 with daily breakdown",
      count: data6.data?.length || 0,
      error: data6.error?.message || null,
      sample: data6.data?.[0] || null,
      fullResponse: data6
    })

    // Test 4: No date range (all time aggregated)
    const urlNoDate = `https://graph.facebook.com/v18.0/${adAccountId}/insights?` +
      `fields=spend,impressions,clicks,date_start,date_stop&` +
      `access_token=${connection.access_token}`

    console.log(`[Force Daily Sync] Testing no date range (all time)...`)
    
    const responseNoDate = await fetch(urlNoDate)
    const dataNoDate = await responseNoDate.json()
    
    tests.push({
      name: "No date range (all time aggregated)",
      count: dataNoDate.data?.length || 0,
      error: dataNoDate.error?.message || null,
      sample: dataNoDate.data?.[0] || null,
      fullResponse: dataNoDate
    })

    return NextResponse.json({
      success: true,
      message: 'Daily breakdown tests completed',
      connectionId: connection.id,
      adAccountId,
      tests,
      conclusion: tests.map(t => `${t.name}: ${t.count} records${t.error ? ` (Error: ${t.error})` : ''}`)
    })

  } catch (error) {
    console.error('[Force Daily Sync] Error:', error)
    return NextResponse.json({
      error: 'Force daily sync failed',
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
