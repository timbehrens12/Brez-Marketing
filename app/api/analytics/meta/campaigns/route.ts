import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'

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

    // Try to get data from the database
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    // First, check if there's an active Meta connection for this brand
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('id, access_token')
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')
      .eq('status', 'active')
      .single()
    
    if (connectionError && connectionError.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Connection error:', connectionError)
    }

    const accessToken = connection?.access_token

    // Get unique campaigns from meta_ad_insights instead of the non-existent meta_campaigns table
    const { data, error } = await supabase
      .from('meta_ad_insights')
      .select('campaign_id, campaign_name, spend, impressions, clicks, date, budget')
      .eq('brand_id', brandId)
      .order('date', { ascending: false })
      
    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch campaign data' }, { status: 500 })
    }
    
    // Process the data to aggregate by campaign and calculate totals
    const campaignMap = new Map();
    
    // Process the data
    data?.forEach(insight => {
      if (!insight.campaign_id || !insight.campaign_name) return;
      
      // Use campaign_id as the key
      const key = insight.campaign_id;
      
      if (!campaignMap.has(key)) {
        campaignMap.set(key, {
          campaign_id: insight.campaign_id,
          campaign_name: insight.campaign_name,
          spend: 0,
          impressions: 0,
          clicks: 0,
          conversions: 0,
          roas: 0,
          ctr: 0,
          cpc: 0,
          budget: Number(insight.budget) || 0, // Include budget from the first record
          status: 'ACTIVE', // Default status since we don't have this in the insights table
          last_updated: insight.date
        });
      }
      
      const campaign = campaignMap.get(key);
      
      // Sum up numeric metrics with better type handling
      campaign.spend += Number(insight.spend) || 0;
      campaign.impressions += Number(insight.impressions) || 0;
      campaign.clicks += Number(insight.clicks) || 0;
      
      // Update budget if this record has it and the current one doesn't
      if (insight.budget && !campaign.budget) {
        campaign.budget = Number(insight.budget) || 0;
      }
      
      // Keep track of the most recent date
      if (new Date(insight.date) > new Date(campaign.last_updated)) {
        campaign.last_updated = insight.date;
        // Use the budget from the most recent record if available
        if (insight.budget) {
          campaign.budget = Number(insight.budget) || 0;
        }
      }
    });
    
    // If we have an access token, fetch campaign budget information directly from Meta API
    if (accessToken && campaignMap.size > 0) {
      try {
        // Get a list of unique campaign IDs
        const campaignIds = Array.from(campaignMap.keys()).filter(id => {
          // Only include campaigns that don't already have budget data
          const campaign = campaignMap.get(id);
          return !campaign.budget || campaign.budget === 0;
        });
        
        if (campaignIds.length > 0) {
          console.log(`Fetching budget info from Meta API for ${campaignIds.length} campaigns`);
          
          // First, get the ad accounts for this brand
          const accountsResponse = await fetch(
            `https://graph.facebook.com/v18.0/me/adaccounts?fields=name,account_id&access_token=${accessToken}`
          );
          
          if (!accountsResponse.ok) {
            throw new Error(`Failed to fetch ad accounts: ${accountsResponse.status}`);
          }
          
          const accountsData = await accountsResponse.json();
          
          if (accountsData.data && accountsData.data.length > 0) {
            // For each ad account, fetch campaign budget info
            for (const account of accountsData.data) {
              const campaignsResponse = await fetch(
                `https://graph.facebook.com/v18.0/${account.id}/campaigns?fields=id,name,daily_budget,lifetime_budget,status&access_token=${accessToken}`
              );
              
              if (!campaignsResponse.ok) {
                console.warn(`Failed to fetch campaigns for account ${account.id}: ${campaignsResponse.status}`);
                continue;
              }
              
              const campaignsData = await campaignsResponse.json();
              
              if (campaignsData.data && campaignsData.data.length > 0) {
                for (const apiCampaign of campaignsData.data) {
                  if (campaignMap.has(apiCampaign.id)) {
                    const campaign = campaignMap.get(apiCampaign.id);
                    
                    // Update the campaign status
                    campaign.status = apiCampaign.status === 'ACTIVE' ? 'ACTIVE' : 
                                      apiCampaign.status === 'PAUSED' ? 'PAUSED' : 
                                      apiCampaign.status === 'ARCHIVED' ? 'ARCHIVED' : 'COMPLETED';
                    
                    // Calculate budget (daily_budget or lifetime_budget)
                    // Note: Budget values from the API are in cents, so divide by 100 to get dollars
                    let budget = 0;
                    if (apiCampaign.daily_budget) {
                      budget = Number(apiCampaign.daily_budget) / 100;
                    } else if (apiCampaign.lifetime_budget) {
                      budget = Number(apiCampaign.lifetime_budget) / 100;
                    }
                    
                    if (budget > 0) {
                      campaign.budget = budget;
                    }
                  }
                }
              }
            }
          }
        }
      } catch (apiError) {
        console.error('Error fetching campaign budget from Meta API:', apiError);
        // Continue with existing data, don't fail the entire request
      }
    }
    
    // Convert the Map to an array and calculate derived metrics
    const campaigns = Array.from(campaignMap.values()).map(campaign => {
      // Calculate CTR and CPC if we have impressions and clicks
      if (campaign.impressions > 0) {
        campaign.ctr = ((campaign.clicks / campaign.impressions) * 100) || 0;
      }
      
      if (campaign.clicks > 0) {
        campaign.cpc = (campaign.spend / campaign.clicks) || 0;
      }
      
      // Ensure all numeric values are defined to prevent toFixed errors
      campaign.spend = campaign.spend || 0;
      campaign.impressions = campaign.impressions || 0;
      campaign.clicks = campaign.clicks || 0;
      campaign.conversions = campaign.conversions || 0;
      campaign.roas = campaign.roas || 0;
      campaign.ctr = campaign.ctr || 0;
      campaign.cpc = campaign.cpc || 0;
      campaign.budget = campaign.budget || 0;
      
      return campaign;
    });
    
    // Sort by spend (descending)
    campaigns.sort((a, b) => b.spend - a.spend);

    return NextResponse.json({ campaigns: campaigns || [] })
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