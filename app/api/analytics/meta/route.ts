import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const url = new URL(request.url)
    const brandId = url.searchParams.get('brandId')
    
    if (!brandId) {
      return NextResponse.json({ error: 'Missing brandId parameter' }, { status: 400 })
    }

    const supabase = createClient()

    const { data, error } = await supabase
      .from('meta_ad_insights')
      .select('*')
      .eq('brand_id', brandId)
      .order('date', { ascending: false })
    
    console.log(`[MetaAnalytics] DEBUG: Database query result:`, JSON.stringify({
      brandId,
      recordCount: data?.length || 0,
      error: error,
      sampleRecord: data?.[0] ? {
        impressions: data[0].impressions,
        clicks: data[0].clicks,
        conversions: data[0].conversions,
        spend: data[0].spend,
        date: data[0].date,
        campaign_id: data[0].campaign_id
      } : null,
      totalSpend: data ? data.reduce((sum: number, item: any) => sum + (parseFloat(item.spend) || 0), 0) : 0,
      totalImpressions: data ? data.reduce((sum: number, item: any) => sum + (parseInt(item.impressions) || 0), 0) : 0,
      totalClicks: data ? data.reduce((sum: number, item: any) => sum + (parseInt(item.clicks) || 0), 0) : 0,
      totalConversions: data ? data.reduce((sum: number, item: any) => sum + (parseInt(item.conversions) || 0), 0) : 0
    }, null, 2))
    
    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch Meta analytics data' }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error in Meta analytics endpoint:', error)
    return NextResponse.json({ 
      error: 'Server error', 
      details: typeof error === 'object' && error !== null && 'message' in error 
        ? (error.message as string) 
        : 'Unknown error'
    }, { status: 500 })
  }
} 