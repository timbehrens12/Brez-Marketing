import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
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
    const activeOnly = searchParams.get('activeOnly') === 'true';
    const forceRefresh = searchParams.get('forceRefresh') === 'true';
    
    if (!brandId) {
      return NextResponse.json(
        { error: 'Missing brandId parameter' },
        { status: 400 }
      );
    }
    
    console.log(`[Total Meta Budget] Processing request for brandId=${brandId}, activeOnly=${activeOnly}, forceRefresh=${forceRefresh}`);
    
    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // If forceRefresh is true, fetch fresh data from Meta API
    if (forceRefresh) {
      console.log('[Total Meta Budget] Force refresh requested, fetching fresh ad set data from Meta API');
      
      try {
        // Get Meta connection data - FIXED: Removed page_id reference
        const { data: connectionData, error: connectionError } = await supabase
          .from('platform_connections')
          .select('access_token, metadata')
          .eq('brand_id', brandId)
          .eq('platform_type', 'meta')
          .eq('status', 'active')
          .single();
        
        if (connectionError) {
          console.error('[Total Meta Budget] Error fetching Meta connection:', connectionError);
          throw connectionError;
        }
        
        if (!connectionData?.access_token) {
          throw new Error('No Meta access token found');
        }
        
        // Get active campaigns only
        const { data: campaigns, error: campaignError } = await supabase
          .from('meta_campaigns')
          .select('campaign_id, campaign_name')
          .eq('brand_id', brandId)
          .eq('status', 'ACTIVE');
        
        if (campaignError) {
          console.error('[Total Meta Budget] Error fetching campaigns:', campaignError);
        } else if (campaigns && campaigns.length > 0) {
          console.log(`[Total Meta Budget] Found ${campaigns.length} active campaigns:`, campaigns.map(c => c.campaign_id));
          console.log(`[Total Meta Budget] Fetching ad sets from Meta API`);
          
          let totalDailyBudget = 0;
          let totalLifetimeBudget = 0;
          let activeAdSetCount = 0;
          
          // Fetch ad sets for each campaign from Meta API
          for (const campaign of campaigns) {
            try {
              const adSetsUrl = `https://graph.facebook.com/v21.0/${campaign.campaign_id}/adsets?fields=id,name,status,daily_budget,lifetime_budget,budget_remaining&access_token=${connectionData.access_token}`;
              console.log(`[Total Meta Budget] Fetching ad sets for campaign ${campaign.campaign_id}`);
              
              const adSetsResponse = await fetch(adSetsUrl);
              
              if (adSetsResponse.ok) {
                const adSetsData = await adSetsResponse.json();
                console.log(`[Total Meta Budget] Ad sets response for campaign ${campaign.campaign_id}:`, adSetsData);
                
                if (adSetsData.data) {
                  adSetsData.data.forEach((adSet: any) => {
                    console.log(`[Total Meta Budget] Processing ad set ${adSet.id} (${adSet.name}): status=${adSet.status}, daily_budget=${adSet.daily_budget}, lifetime_budget=${adSet.lifetime_budget}`);
                    
                    // Only count ACTIVE ad sets, or all if activeOnly is false
                    if (!activeOnly || adSet.status === 'ACTIVE') {
                      activeAdSetCount++;
                      
                      // Ad sets have either daily_budget or lifetime_budget
                      if (adSet.daily_budget) {
                        const dailyBudget = parseInt(adSet.daily_budget) / 100; // Convert from cents to dollars
                        totalDailyBudget += dailyBudget;
                        console.log(`[Total Meta Budget] Added daily budget: $${dailyBudget} (total now: $${totalDailyBudget})`);
                      }
                      
                      if (adSet.lifetime_budget) {
                        const lifetimeBudget = parseInt(adSet.lifetime_budget) / 100; // Convert from cents to dollars
                        totalLifetimeBudget += lifetimeBudget;
                        console.log(`[Total Meta Budget] Added lifetime budget: $${lifetimeBudget} (total now: $${totalLifetimeBudget})`);
                      }
                    } else {
                      console.log(`[Total Meta Budget] Skipping ad set ${adSet.id} due to status: ${adSet.status}`);
                    }
                  });
                }
              } else {
                console.error(`[Total Meta Budget] Failed to fetch ad sets for campaign ${campaign.campaign_id}:`, adSetsResponse.status, adSetsResponse.statusText);
              }
            } catch (error) {
              console.error(`[Total Meta Budget] Error fetching ad sets for campaign ${campaign.campaign_id}:`, error);
            }
          }
          
          const totalBudget = totalDailyBudget + totalLifetimeBudget;
          console.log(`[Total Meta Budget] Meta API result - Daily: $${totalDailyBudget}, Lifetime: $${totalLifetimeBudget}, Total: $${totalBudget}, Active Ad Sets: ${activeAdSetCount}`);
          
          const result = {
            success: true,
            totalDailyBudget,
            totalLifetimeBudget,
            totalBudget,
            adSetCount: activeAdSetCount,
            dailyBudgetAdSetCount: totalDailyBudget > 0 ? activeAdSetCount : 0,
            lifetimeBudgetAdSetCount: totalLifetimeBudget > 0 ? activeAdSetCount : 0,
            timestamp: new Date().toISOString(),
            refreshMethod: 'meta-api'
          };
          
          console.log('[Total Meta Budget] Final Meta API result:', JSON.stringify(result, null, 2));
          
          return NextResponse.json(result, { status: 200 });
        }
      } catch (error) {
        console.error('[Total Meta Budget] Error fetching from Meta API, falling back to database:', error);
        // Fall through to database query
      }
    }
    
        console.log('[Total Meta Budget] Fetching data from database (fallback or non-force refresh)');

    let adSets: any[] = [];
    let totalDailyBudget = 0;
    let totalLifetimeBudget = 0;
    
    if (activeOnly) {
      console.log('[Total Meta Budget] Fetching only active ad sets in active campaigns');
      
      // Get active campaigns first
      const { data: activeCampaigns, error: campaignError } = await supabase
        .from('meta_campaigns')
        .select('campaign_id, campaign_name')
        .eq('brand_id', brandId)
        .eq('status', 'ACTIVE');
      
      if (campaignError) {
        console.error('[Total Meta Budget] Error fetching active campaigns:', campaignError);
        return NextResponse.json(
          { error: 'Failed to fetch campaigns', details: campaignError.message },
          { status: 500 }
        );
      }
      
        console.log(`[Total Meta Budget] Found ${activeCampaigns?.length || 0} active campaigns`);
      console.log('[Total Meta Budget] Active campaigns:', activeCampaigns?.map(c => c.campaign_name));
      
      if (activeCampaigns && activeCampaigns.length > 0) {
        const campaignIds = activeCampaigns.map(c => c.campaign_id);
        
        // Get ad sets that belong to active campaigns and are themselves active
        const { data: activeAdSetsData, error: adSetsError } = await supabase
        .from('meta_adsets')
          .select('adset_id, adset_name, campaign_id, status, budget, budget_type')
        .eq('brand_id', brandId)
          .in('campaign_id', campaignIds)
          .eq('status', 'ACTIVE'); // Only get ACTIVE ad sets
        
        if (adSetsError) {
          console.error('[Total Meta Budget] Error fetching ad sets:', adSetsError);
          return NextResponse.json(
            { error: 'Failed to fetch ad sets', details: adSetsError.message },
            { status: 500 }
          );
        }
        
        adSets = activeAdSetsData;
        console.log(`[Total Meta Budget] Found ${adSets?.length || 0} active ad sets in active campaigns`);
        console.log('[Total Meta Budget] Active ad sets:', adSets?.map(a => `${a.adset_name} (${a.status})`));
      } else {
        adSets = [];
      }
    } else {
      // Get all ad sets for the brand
      const { data: allAdSetsData, error: adSetsError } = await supabase
        .from('meta_adsets')
        .select('adset_id, adset_name, campaign_id, status, budget, budget_type')
        .eq('brand_id', brandId);
    
    if (adSetsError) {
        console.error('[Total Meta Budget] Error fetching all ad sets:', adSetsError);
      return NextResponse.json(
        { error: 'Failed to fetch ad sets', details: adSetsError.message },
        { status: 500 }
      );
    }
    
      adSets = allAdSetsData;
      console.log(`[Total Meta Budget] Found ${adSets?.length || 0} total ad sets`);
    }
    
    // Calculate budgets from database data
    if (adSets && adSets.length > 0) {
      adSets.forEach((adSet: any) => {
          const budget = parseFloat(adSet.budget) || 0;
        console.log(`[Total Meta Budget] Processing DB ad set ${adSet.adset_name}: budget=$${budget}, type=${adSet.budget_type}`);
        
        if (adSet.budget_type === 'daily') {
          totalDailyBudget += budget;
        } else if (adSet.budget_type === 'lifetime') {
          totalLifetimeBudget += budget;
        }
      });
    }
    
    console.log(`[Total Meta Budget] Calculated budgets - Daily: $${totalDailyBudget}, Lifetime: $${totalLifetimeBudget}, Total: $${totalDailyBudget + totalLifetimeBudget}, Count: ${adSets?.length || 0}`);
    
    const finalResult = {
        success: true,
        totalDailyBudget,
        totalLifetimeBudget,
        totalBudget: totalDailyBudget + totalLifetimeBudget,
        adSetCount: adSets ? adSets.length : 0,
        dailyBudgetAdSetCount: adSets ? adSets.filter(adSet => adSet.budget_type === 'daily').length : 0,
        lifetimeBudgetAdSetCount: adSets ? adSets.filter(adSet => adSet.budget_type === 'lifetime').length : 0,
      timestamp: new Date().toISOString(),
      refreshMethod: 'database'
    };
    
    console.log('[Total Meta Budget] Final database result:', JSON.stringify(finalResult, null, 2));
    
    return NextResponse.json(finalResult, { status: 200 });
  } catch (error) {
    console.error('[Total Meta Budget] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 