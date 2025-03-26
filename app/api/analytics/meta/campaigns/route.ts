import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'
import { format } from 'date-fns'

// Define types for our data
interface MetaInsight {
  campaign_id: string;
  spend: string;
  impressions: string;
  clicks: string;
  conversions: string;
  date: string;
  [key: string]: any;
}

interface MetaCampaign {
  campaign_id: string;
  campaign_name: string;
  status: string;
  estimated_revenue?: number;
  start_time?: string;
  stop_time?: string | null;
  [key: string]: any;
}

interface CampaignResponse {
  id: string;
  campaign_name: string;
  status: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  conversions: number;
  cpa: number;
  roas: number;
  start_date?: string;
  end_date?: string | null;
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const brandId = url.searchParams.get('brandId')
    const fromDate = url.searchParams.get('from')
    const toDate = url.searchParams.get('to')
    
    // Log the requested date range for debugging
    console.log(`Meta Campaigns - Request date range: from=${fromDate}, to=${toDate}, brandId=${brandId}`)
    
    if (!brandId) {
      return NextResponse.json({ error: 'Missing brandId parameter' }, { status: 400 })
    }

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    // First fetch all campaigns for this brand
    const { data: campaignData, error: campaignError } = await supabase
      .from('meta_campaigns')
      .select('*')
      .eq('brand_id', brandId)
    
    if (campaignError) {
      console.error('Database error fetching campaigns:', campaignError)
      return NextResponse.json({ error: 'Failed to fetch Meta campaigns data' }, { status: 500 })
    }

    // Build the query for insights (metrics)
    let insightsQuery = supabase
      .from('meta_ad_insights')
      .select('*')
      .eq('brand_id', brandId)
    
    // Add date filtering if provided
    if (fromDate) {
      try {
        const parsedFromDate = new Date(fromDate)
        const formattedFromDate = format(parsedFromDate, 'yyyy-MM-dd')
        insightsQuery = insightsQuery.gte('date', formattedFromDate)
        console.log(`Filtering from date: ${formattedFromDate}`)
      } catch (e) {
        console.error(`Invalid from date format: ${fromDate}`, e)
      }
    }
    
    if (toDate) {
      try {
        const parsedToDate = new Date(toDate)
        const formattedToDate = format(parsedToDate, 'yyyy-MM-dd')
        insightsQuery = insightsQuery.lte('date', formattedToDate)
        console.log(`Filtering to date: ${formattedToDate}`)
      } catch (e) {
        console.error(`Invalid to date format: ${toDate}`, e)
      }
    }
    
    // Fetch insights with date filtering
    const { data: insightsData, error: insightsError } = await insightsQuery

    if (insightsError) {
      console.error('Database error fetching insights:', insightsError)
      return NextResponse.json({ error: 'Failed to fetch Meta insights data' }, { status: 500 })
    }
    
    console.log(`Retrieved ${insightsData?.length || 0} Meta insights records for date range`)

    // Start with empty campaigns array
    let campaigns: CampaignResponse[] = [];
    
    // Process the data only if we have both campaigns and insights
    if (campaignData && campaignData.length > 0 && insightsData && insightsData.length > 0) {
      // Group insights by campaign_id
      const insightsByCampaign: Record<string, MetaInsight[]> = {};
      
      insightsData.forEach((insight: MetaInsight) => {
        if (!insight.campaign_id) return;
        
        if (!insightsByCampaign[insight.campaign_id]) {
          insightsByCampaign[insight.campaign_id] = [];
        }
        
        insightsByCampaign[insight.campaign_id].push(insight);
      });
      
      // Process each campaign with its insights
      campaigns = (campaignData as MetaCampaign[]).map(campaign => {
        const campaignInsights = insightsByCampaign[campaign.campaign_id] || [];
        
        // Sum up metrics from all insights for this campaign
        const totalSpend = campaignInsights.reduce(
          (sum: number, insight: MetaInsight) => sum + parseFloat(insight.spend || '0'), 
          0
        );
        
        const totalImpressions = campaignInsights.reduce(
          (sum: number, insight: MetaInsight) => sum + parseInt(insight.impressions || '0'), 
          0
        );
        
        const totalClicks = campaignInsights.reduce(
          (sum: number, insight: MetaInsight) => sum + parseInt(insight.clicks || '0'), 
          0
        );
        
        const totalConversions = campaignInsights.reduce(
          (sum: number, insight: MetaInsight) => sum + parseInt(insight.conversions || '0'), 
          0
        );
        
        // Calculate derived metrics
        const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
        const cpa = totalConversions > 0 ? totalSpend / totalConversions : 0;
        const roas = totalSpend > 0 ? (campaign.estimated_revenue || 0) / totalSpend : 0;
        
        return {
          id: campaign.campaign_id,
          campaign_name: campaign.campaign_name,
          status: campaign.status,
          spend: totalSpend,
          impressions: totalImpressions,
          clicks: totalClicks,
          ctr: ctr,
          conversions: totalConversions,
          cpa: cpa,
          roas: roas,
          start_date: campaign.start_time,
          end_date: campaign.stop_time
        };
      });
    }
    
    // Sort by spend (descending)
    campaigns.sort((a, b) => b.spend - a.spend);

    // Return only campaigns with spend > 0 during the selected period
    const activeCampaigns = campaigns.filter(campaign => campaign.spend > 0);

    return NextResponse.json({ 
      campaigns: activeCampaigns.length > 0 ? activeCampaigns : campaigns,
      _debug: {
        requestedDateRange: { fromDate, toDate },
        campaignsCount: campaignData?.length || 0,
        insightsCount: insightsData?.length || 0,
        filteredCampaignsCount: activeCampaigns.length
      }
    })
  } catch (error) {
    console.error('Error in Meta campaigns endpoint:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch campaigns', 
      details: typeof error === 'object' && error !== null && 'message' in error 
        ? (error.message as string) 
        : 'Unknown error',
      status: 500
    }, { status: 500 })
  }
} 