import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const brandId = searchParams.get('brandId')
    
    if (!brandId) {
      return NextResponse.json({ error: 'brandId is required' }, { status: 400 })
    }

    // Get test campaign data
    const { data: campaigns, error: campaignsError } = await supabase
      .from('meta_test_campaigns')
      .select('*')
      .eq('brand_id', brandId)
    
    if (campaignsError) {
      console.error('Error fetching Meta test campaigns:', campaignsError)
      return NextResponse.json({ error: 'Failed to fetch Meta test campaigns' }, { status: 500 })
    }
    
    return NextResponse.json({ 
      campaigns: campaigns || [],
      totalSpend: campaigns?.reduce((sum, campaign) => sum + (campaign.spend || 0), 0) || 0,
      totalImpressions: campaigns?.reduce((sum, campaign) => sum + (campaign.impressions || 0), 0) || 0,
      totalClicks: campaigns?.reduce((sum, campaign) => sum + (campaign.clicks || 0), 0) || 0,
      totalConversions: campaigns?.reduce((sum, campaign) => sum + (campaign.conversions || 0), 0) || 0,
    })
    
  } catch (error) {
    console.error('Error in Meta test campaigns API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 