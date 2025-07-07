import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedSupabaseClient } from '@/lib/utils/unified-supabase'

export async function POST(request: NextRequest) {
  try {
    const { userId, startDate, endDate, accessToken, adAccountId } = await request.json()
    
    if (!userId || !startDate || !endDate || !accessToken || !adAccountId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    console.log('🔄 Starting Meta backfill for', startDate, 'to', endDate)
    
    const supabase = await getAuthenticatedSupabaseClient()
    
    // Fetch historical data from Meta API
    const metaUrl = `https://graph.facebook.com/v18.0/${adAccountId}/insights`
    const params = new URLSearchParams({
      access_token: accessToken,
      fields: 'date_start,date_stop,impressions,clicks,spend,actions,conversions,reach,frequency,ctr,cpc,cost_per_result',
      time_range: JSON.stringify({
        since: startDate,
        until: endDate
      }),
      time_increment: '1', // Daily data
      level: 'account',
      limit: '1000'
    })
    
    const response = await fetch(`${metaUrl}?${params}`)
    
    if (!response.ok) {
      console.error('Meta API error:', await response.text())
      return NextResponse.json({ error: 'Failed to fetch from Meta API' }, { status: 500 })
    }
    
    const data = await response.json()
    
    if (!data.data || data.data.length === 0) {
      console.log('No Meta data found for the specified date range')
      return NextResponse.json({ success: true, records_created: 0 })
    }
    
    // Process and insert data into Supabase
    const recordsToInsert = data.data.map((insight: any) => ({
      user_id: userId,
      date_start: insight.date_start,
      date_stop: insight.date_stop,
      impressions: parseInt(insight.impressions) || 0,
      clicks: parseInt(insight.clicks) || 0,
      spend: parseFloat(insight.spend) || 0,
      reach: parseInt(insight.reach) || 0,
      frequency: parseFloat(insight.frequency) || 0,
      ctr: parseFloat(insight.ctr) || 0,
      cpc: parseFloat(insight.cpc) || 0,
      cost_per_result: parseFloat(insight.cost_per_result) || 0,
      actions: insight.actions || [],
      conversions: insight.conversions || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }))
    
    // Insert records using upsert to avoid duplicates
    const { data: insertedData, error: insertError } = await supabase
      .from('meta_ad_insights')
      .upsert(recordsToInsert, {
        onConflict: 'user_id,date_start',
        ignoreDuplicates: false
      })
    
    if (insertError) {
      console.error('Error inserting Meta data:', insertError)
      return NextResponse.json({ error: 'Failed to insert data' }, { status: 500 })
    }
    
    console.log('✅ Meta backfill completed:', recordsToInsert.length, 'records')
    
    return NextResponse.json({
      success: true,
      records_created: recordsToInsert.length,
      date_range: { start: startDate, end: endDate }
    })
    
  } catch (error) {
    console.error('Error in Meta backfill:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 