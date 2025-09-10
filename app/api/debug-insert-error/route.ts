import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const brandId = '0da80e8f-2df3-468d-9053-08fa4d24e6e8'
    
    console.log(`[Insert Debug] Starting insert error debug for brand ${brandId}`)

    const supabase = createClient()
    const { data: connection, error: connError } = await supabase
      .from('platform_connections')
      .select('id, access_token')
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')
      .eq('status', 'active')
      .maybeSingle()

    if (connError || !connection) {
      return NextResponse.json({ error: 'No connection found' }, { status: 404 })
    }

    // Get account ID
    const accountResponse = await fetch(`https://graph.facebook.com/v18.0/me/adaccounts?access_token=${connection.access_token}&fields=id,name`)
    const accountData = await accountResponse.json()
    const accountId = accountData.data?.[0]?.id

    if (!accountId) {
      return NextResponse.json({ error: 'No ad account found' }, { status: 404 })
    }

    // Get ONE insight to test exact insert
    const testUrl = `https://graph.facebook.com/v18.0/${accountId}/insights?access_token=${connection.access_token}&time_range={"since":"2025-03-21","until":"2025-03-22"}&fields=ad_id,adset_id,spend,impressions,clicks,reach,date_start&level=ad&limit=1`
    
    const testResponse = await fetch(testUrl)
    const testData = await testResponse.json()
    
    if (testData.error) {
      return NextResponse.json({
        success: false,
        error: 'Meta API Error',
        details: testData.error
      })
    }

    const insights = testData.data || []
    
    if (insights.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No insights returned from Meta API'
      })
    }

    const insight = insights[0]
    console.log('[Insert Debug] Raw insight from Meta:', insight)

    // Create the exact data we're trying to insert
    const insertData = {
      brand_id: brandId,
      ad_id: insight.ad_id,
      adset_id: insight.adset_id,
      date: insight.date_start,
      spent: parseFloat(insight.spend) || 0,
      impressions: parseInt(insight.impressions) || 0,
      clicks: parseInt(insight.clicks) || 0,
      conversions: 0,
      ctr: 0,
      cpc: 0,
      cost_per_conversion: 0,
      reach: parseInt(insight.reach) || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      results: 0,
      cost_per_result: 0,
      page_view_count: 0,
      add_to_cart_count: 0,
      initiate_checkout_count: 0,
      add_payment_info_count: 0,
      view_content_count: 0,
      purchase_count: 0,
      lead_count: 0,
      complete_registration_count: 0,
      funnel_conversion_rate: 0,
      search_count: 0,
      add_to_wishlist_count: 0
    }

    console.log('[Insert Debug] Data we are trying to insert:', insertData)

    // Try the insert and capture the exact error
    const { data: insertResult, error: insertError } = await supabase
      .from('meta_ad_daily_insights')
      .insert(insertData)
      .select()

    console.log('[Insert Debug] Insert result:', insertResult)
    console.log('[Insert Debug] Insert error:', insertError)

    if (insertError) {
      return NextResponse.json({
        success: false,
        error: 'Database Insert Failed',
        details: insertError,
        rawInsight: insight,
        insertData: insertData,
        message: 'Exact error from database insert attempt'
      })
    }

    // Clean up test record
    if (insertResult && insertResult.length > 0) {
      await supabase
        .from('meta_ad_daily_insights')
        .delete()
        .eq('id', insertResult[0].id)
    }

    return NextResponse.json({
      success: true,
      message: 'Insert test successful',
      rawInsight: insight,
      insertData: insertData,
      insertResult: insertResult
    })

  } catch (error) {
    console.error('[Insert Debug] Error:', error)
    return NextResponse.json({ 
      error: 'Failed to debug insert',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
