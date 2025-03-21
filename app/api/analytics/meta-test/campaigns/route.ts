import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const brandId = searchParams.get('brandId')
    
    if (!brandId) {
      return NextResponse.json({ error: 'brandId is required' }, { status: 400 })
    }

    console.log(`Fetching meta test campaigns for brand ID: ${brandId}`)

    // Get test campaign data
    const { data: campaigns, error: campaignsError } = await supabase
      .from('meta_test_campaigns')
      .select('*')
      .eq('brand_id', brandId)
    
    if (campaignsError) {
      console.error('Error fetching Meta test campaigns:', campaignsError)
      return NextResponse.json({ error: 'Failed to fetch Meta test campaigns' }, { status: 500 })
    }

    if (!campaigns || campaigns.length === 0) {
      console.warn(`No Meta test campaigns found for brand ${brandId}`)
      
      // Return empty data structure instead of an error
      return NextResponse.json({ 
        campaigns: [],
        totalSpend: 0,
        totalImpressions: 0,
        totalClicks: 0,
        totalConversions: 0,
      })
    }

    console.log(`Found ${campaigns.length} Meta test campaigns for brand ${brandId}`)
    
    return NextResponse.json({ 
      campaigns: campaigns || [],
      totalSpend: campaigns.reduce((sum, campaign) => sum + (campaign.spend || 0), 0) || 0,
      totalImpressions: campaigns.reduce((sum, campaign) => sum + (campaign.impressions || 0), 0) || 0,
      totalClicks: campaigns.reduce((sum, campaign) => sum + (campaign.clicks || 0), 0) || 0,
      totalConversions: campaigns.reduce((sum, campaign) => sum + (campaign.conversions || 0), 0) || 0,
    })
    
  } catch (error) {
    console.error('Error in Meta test campaigns API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 