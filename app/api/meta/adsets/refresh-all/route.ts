import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs';
import { fetchMetaAdSets } from '@/lib/services/meta-service';

export async function POST(req: NextRequest) {
  try {
    // Verify user authentication
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - You must be logged in to access this resource' },
        { status: 401 }
      );
    }
    
    // Get brand ID from query parameters
    const searchParams = req.nextUrl.searchParams;
    const brandId = searchParams.get('brandId');
    
    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 });
    }
    
    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Get all campaigns for the brand
    const { data: campaigns, error: campaignsError } = await supabase
      .from('meta_campaigns')
      .select('campaign_id')
      .eq('brand_id', brandId);
    
    if (campaignsError) {
      console.error('Error fetching campaigns:', campaignsError);
      return NextResponse.json(
        { error: 'Failed to fetch campaigns', details: campaignsError.message },
        { status: 500 }
      );
    }
    
    if (!campaigns || campaigns.length === 0) {
      return NextResponse.json(
        { message: 'No campaigns found for this brand', refreshedCampaigns: 0 },
        { status: 200 }
      );
    }
    
    // Process campaigns to refresh ad sets
    const refreshedCampaigns = [];
    
    for (const campaign of campaigns) {
      try {
        // Fetch ad sets for each campaign
        const result = await fetchMetaAdSets(brandId, campaign.campaign_id, true);
        
        if (result && result.success) {
          refreshedCampaigns.push(campaign.campaign_id);
        }
      } catch (error) {
        console.error(`Error refreshing ad sets for campaign ${campaign.campaign_id}:`, error);
        // Continue with other campaigns even if one fails
      }
    }
    
    // Call the SQL function to calculate and update adset_budget_total for all campaigns
    const { data: refreshResult, error: refreshError } = await supabase.rpc(
      'update_campaign_adset_budget_totals',
      { brand_uuid: brandId }
    );
    
    if (refreshError) {
      console.error('Error updating campaign adset budget totals:', refreshError);
      return NextResponse.json(
        { 
          partialSuccess: true, 
          message: 'Ad sets fetched but failed to update campaign budget totals',
          refreshedCampaigns: refreshedCampaigns.length,
          error: refreshError.message 
        },
        { status: 200 }
      );
    }
    
    return NextResponse.json(
      { 
        success: true, 
        message: 'Successfully refreshed ad sets and updated campaign budget totals',
        refreshedCampaigns: refreshedCampaigns.length,
        updateResult: refreshResult
      },
      { status: 200 }
    );
    
  } catch (error: any) {
    console.error('Error in refresh-all ad sets endpoint:', error);
    
    return NextResponse.json(
      { error: 'Failed to refresh ad sets', details: error.message },
      { status: 500 }
    );
  }
} 