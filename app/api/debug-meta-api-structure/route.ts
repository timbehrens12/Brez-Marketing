import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const brandId = '0da80e8f-2df3-468d-9053-08fa4d24e6e8'
    
    console.log(`[API Debug] Starting Meta API structure debug for brand ${brandId}`)

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

    // Test one specific date range with minimal fields first
    const testUrl = `https://graph.facebook.com/v18.0/${accountId}/insights?access_token=${connection.access_token}&time_range={"since":"2025-03-21","until":"2025-03-22"}&fields=ad_id,adset_id,spend,impressions,clicks,reach,date_start&level=ad&limit=5`
    
    const testResponse = await fetch(testUrl)
    const testData = await testResponse.json()
    
    console.log('[API Debug] Meta API Response:', testData)
    
    if (testData.error) {
      return NextResponse.json({
        success: false,
        error: 'Meta API Error',
        details: testData.error,
        testUrl
      })
    }

    const insights = testData.data || []
    console.log('[API Debug] Insights:', insights)

    // Show exactly what fields are available
    const analysis = {
      totalRecords: insights.length,
      sampleInsight: insights[0] || null,
      allFieldsFound: insights.length > 0 ? Object.keys(insights[0]) : [],
      requiredFieldsCheck: {},
      apiStructure: insights.map(insight => ({
        raw: insight,
        mappedToOurTable: {
          brand_id: brandId,
          ad_id: insight.ad_id || 'MISSING',
          adset_id: insight.adset_id || 'MISSING',
          date: insight.date_start || 'MISSING',
          spent: insight.spend || 'MISSING',
          impressions: insight.impressions || 'MISSING',
          clicks: insight.clicks || 'MISSING',
          reach: insight.reach || 'MISSING'
        }
      }))
    }

    // Check each required field
    if (insights.length > 0) {
      const sample = insights[0]
      analysis.requiredFieldsCheck = {
        ad_id: sample.hasOwnProperty('ad_id') ? '✅' : '❌ MISSING',
        adset_id: sample.hasOwnProperty('adset_id') ? '✅' : '❌ MISSING', 
        date_start: sample.hasOwnProperty('date_start') ? '✅' : '❌ MISSING',
        spend: sample.hasOwnProperty('spend') ? '✅' : '❌ MISSING',
        impressions: sample.hasOwnProperty('impressions') ? '✅' : '❌ MISSING',
        clicks: sample.hasOwnProperty('clicks') ? '✅' : '❌ MISSING',
        reach: sample.hasOwnProperty('reach') ? '✅' : '❌ MISSING'
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Meta API structure analysis completed',
      accountId,
      connectionId: connection.id,
      testUrl,
      analysis
    })

  } catch (error) {
    console.error('[API Debug] Error:', error)
    return NextResponse.json({ 
      error: 'Failed to debug Meta API structure',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
