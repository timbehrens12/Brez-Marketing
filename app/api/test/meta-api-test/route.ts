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

    console.log(`[Meta API Test] Testing with connection: ${connection.id}`)

    // Test 1: Get ad accounts
    const accountsUrl = `https://graph.facebook.com/v18.0/me/adaccounts?access_token=${connection.access_token}&fields=id,name,account_status`
    const accountsResponse = await fetch(accountsUrl)
    const accountsData = await accountsResponse.json()

    if (!accountsResponse.ok || !accountsData.data?.[0]) {
      return NextResponse.json({
        error: 'Failed to get Meta ad accounts',
        response: accountsData,
        status: accountsResponse.status
      }, { status: 500 })
    }

    const adAccountId = accountsData.data[0].id
    console.log(`[Meta API Test] Found ad account: ${adAccountId}`)

    // Test 2: Get campaigns
    const campaignsUrl = `https://graph.facebook.com/v18.0/${adAccountId}/campaigns?fields=id,name,status&access_token=${connection.access_token}&limit=5`
    const campaignsResponse = await fetch(campaignsUrl)
    const campaignsData = await campaignsResponse.json()

    console.log(`[Meta API Test] Campaigns response:`, campaignsData)

    // Test 3: Get insights
    const insightsUrl = `https://graph.facebook.com/v18.0/${adAccountId}/insights?fields=spend,impressions,date_start&time_range={"since":"2024-01-01","until":"2024-01-15"}&access_token=${connection.access_token}&limit=5`
    const insightsResponse = await fetch(insightsUrl)
    const insightsData = await insightsResponse.json()

    console.log(`[Meta API Test] Insights response:`, insightsData)

    return NextResponse.json({
      success: true,
      connectionId: connection.id,
      adAccountId,
      accounts: {
        count: accountsData.data?.length || 0,
        first: accountsData.data?.[0]
      },
      campaigns: {
        count: campaignsData.data?.length || 0,
        first: campaignsData.data?.[0],
        error: campaignsData.error
      },
      insights: {
        count: insightsData.data?.length || 0,
        first: insightsData.data?.[0],
        error: insightsData.error
      }
    })

  } catch (error) {
    console.error('[Meta API Test] Error:', error)
    return NextResponse.json({
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
