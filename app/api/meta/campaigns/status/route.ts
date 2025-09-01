import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const brandId = searchParams.get('brandId')
    const campaignIds = searchParams.get('campaignIds')
    const forceRefresh = searchParams.get('force') === 'true'
    
    if (!brandId || !campaignIds) {
      return NextResponse.json({ error: 'Missing brandId or campaignIds' }, { status: 400 })
    }

    const campaignIdArray = campaignIds.split(',')
    
    // Initialize Supabase client
    const supabase = createClient()

    // Fetch updated campaign data from the database
    const { data: campaigns, error } = await supabase
      .from('meta_campaigns')
      .select('*')
      .eq('brand_id', brandId)
      .in('campaign_id', campaignIdArray)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching campaigns:', error)
      return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 })
    }

    // Transform the data to match the expected format
    const transformedCampaigns = campaigns?.map(campaign => ({
      campaign_id: campaign.campaign_id,
      campaign_name: campaign.campaign_name,
      account_id: campaign.account_id,
      account_name: campaign.account_name,
      status: campaign.status,
      objective: campaign.objective,
      budget: Number(campaign.budget) || 0,
      budget_type: campaign.budget_type,
      spent: Number(campaign.spent) || 0,
      impressions: Number(campaign.impressions) || 0,
      clicks: Number(campaign.clicks) || 0,
      conversions: Number(campaign.conversions) || 0,
      ctr: Number(campaign.ctr) || 0,
      cpc: Number(campaign.cpc) || 0,
      roas: Number(campaign.roas) || 0,
      created_at: campaign.created_at,
      updated_at: campaign.updated_at,
      platform: 'meta'
    })) || []

    return NextResponse.json({
      success: true,
      campaigns: transformedCampaigns,
      forceRefresh,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in campaign status check:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 