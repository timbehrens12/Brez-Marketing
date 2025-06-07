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
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 });
    }
    
    console.log(`[Total Meta Budget] Processing request for brandId=${brandId}, activeOnly=${activeOnly}, forceRefresh=${forceRefresh}`);
    
    // If forceRefresh is true, fetch fresh ad set data from Meta API first
    if (forceRefresh) {
      console.log(`[Total Meta Budget] Force refresh requested, fetching fresh ad set data from Meta API`);
      try {
        // First get all active campaigns
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { persistSession: false } }
        );
        
        const { data: campaigns, error: campaignError } = await supabase
          .from('meta_campaigns')
          .select('campaign_id, status')
          .eq('brand_id', brandId)
          .eq('status', 'ACTIVE');
          
        if (campaignError) {
          console.error('[Total Meta Budget] Error fetching campaigns:', campaignError);
        } else if (campaigns && campaigns.length > 0) {
          console.log(`[Total Meta Budget] Found ${campaigns.length} active campaigns:`, campaigns.map(c => c.campaign_id));
          console.log(`[Total Meta Budget] Fetching ad sets from Meta API`);
          
          // Get Meta connection details
          const { data: connectionData, error: connectionError } = await supabase
            .from('platform_connections')
            .select('access_token, page_id')
            .eq('brand_id', brandId)
            .eq('platform', 'meta')
            .single();
            
          if (connectionError || !connectionData) {
            console.error('[Total Meta Budget] Error fetching Meta connection:', connectionError);
          } else {
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
                  console.log(`[Total Meta Budget] Campaign ${campaign.campaign_id} ad sets response:`, JSON.stringify(adSetsData, null, 2));

                  if (adSetsData.data) {
                    console.log(`[Total Meta Budget] Found ${adSetsData.data.length} ad sets for campaign ${campaign.campaign_id}`);
                    adSetsData.data.forEach((adSet: any) => {
                      console.log(`[Total Meta Budget] Processing ad set ${adSet.name} (${adSet.id}): status=${adSet.status}, daily_budget=${adSet.daily_budget}, lifetime_budget=${adSet.lifetime_budget}`);
                      
                      if (!activeOnly || adSet.status === 'ACTIVE') {
                        activeAdSetCount++;

                        // Ad sets have either daily_budget or lifetime_budget
                        if (adSet.daily_budget) {
                          const dailyBudget = parseInt(adSet.daily_budget) / 100; // Convert from cents
                          totalDailyBudget += dailyBudget;
                          console.log(`[Total Meta Budget] Ad set ${adSet.name}: daily budget $${dailyBudget}`);
                        } else if (adSet.lifetime_budget) {
                          const lifetimeBudget = parseInt(adSet.lifetime_budget) / 100; // Convert from cents
                          totalLifetimeBudget += lifetimeBudget;
                          console.log(`[Total Meta Budget] Ad set ${adSet.name}: lifetime budget $${lifetimeBudget}`);
                        } else {
                          console.log(`[Total Meta Budget] Ad set ${adSet.name}: no budget found (daily_budget=${adSet.daily_budget}, lifetime_budget=${adSet.lifetime_budget})`);
                        }
                      } else {
                        console.log(`[Total Meta Budget] Skipping ad set ${adSet.name}: status=${adSet.status} (activeOnly=${activeOnly})`);
                      }
                    });
                  } else {
                    console.log(`[Total Meta Budget] No ad sets data for campaign ${campaign.campaign_id}`);
                  }
                } else {
                  console.error(`[Total Meta Budget] Error fetching ad sets for campaign ${campaign.campaign_id}: ${adSetsResponse.status}`);
                  const errorText = await adSetsResponse.text();
                  console.error(`[Total Meta Budget] Error response:`, errorText);
                }
              } catch (error) {
                console.error(`[Total Meta Budget] Error fetching ad sets for campaign ${campaign.campaign_id}:`, error);
              }
            }
            
            const totalBudget = totalDailyBudget + totalLifetimeBudget;
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

            console.log(`[Total Meta Budget] Meta API result:`, JSON.stringify(result, null, 2));

            return NextResponse.json(result, { status: 200 });
          }
        } else {
          console.log('[Total Meta Budget] No active campaigns found');
          return NextResponse.json(
            { 
              success: true,
              totalDailyBudget: 0,
              totalLifetimeBudget: 0,
              totalBudget: 0,
              adSetCount: 0,
              dailyBudgetAdSetCount: 0,
              lifetimeBudgetAdSetCount: 0,
              timestamp: new Date().toISOString(),
              refreshMethod: 'meta-api'
            },
            { status: 200 }
          );
        }
      } catch (metaError) {
        console.error(`[Total Meta Budget] Error fetching from Meta API, falling back to database:`, metaError);
      }
    }

    // Initialize Supabase client for database fallback
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );
    
    console.log(`[Total Meta Budget] Fetching data from database (fallback or non-force refresh)`);
    
    let adSets = [];
    let adSetsError;
    
    if (activeOnly) {
      // For activeOnly=true, we need to join with campaigns to check both statuses
      console.log(`[Total Meta Budget] Fetching only active ad sets in active campaigns`);
      
      // First, let's check what campaigns are active for debugging
      const { data: activeCampaigns, error: campaignError } = await supabase
        .from('meta_campaigns')
        .select('campaign_id, campaign_name, status')
        .eq('brand_id', brandId)
        .eq('status', 'ACTIVE');
      
      if (campaignError) {
        console.error('[Total Meta Budget] Error fetching active campaigns:', campaignError);
      } else {
        console.log(`[Total Meta Budget] Found ${activeCampaigns?.length || 0} active campaigns`);
        if (activeCampaigns && activeCampaigns.length > 0) {
          console.log('[Total Meta Budget] Active campaigns:', activeCampaigns.map(c => `${c.campaign_name} (${c.campaign_id})`));
        }
      }
      
      // Get active ad sets from active campaigns
      if (activeCampaigns && activeCampaigns.length > 0) {
        const activeCampaignIds = activeCampaigns.map(c => c.campaign_id);
        
        const { data: activeAdSets, error: adSetsError1 } = await supabase
          .from('meta_adsets')
          .select('*')
          .eq('brand_id', brandId)
          .eq('status', 'ACTIVE')
          .in('campaign_id', activeCampaignIds);

        if (adSetsError1) {
          console.error('[Total Meta Budget] Error fetching active ad sets:', adSetsError1);
          adSetsError = adSetsError1;
        } else {
          adSets = activeAdSets || [];
          console.log(`[Total Meta Budget] Found ${adSets.length} active ad sets in active campaigns`);
        }
      } else {
        console.log('[Total Meta Budget] No active campaigns found, returning empty ad sets');
        adSets = [];
      }
    } else {
      // For activeOnly=false, get all ad sets
      console.log(`[Total Meta Budget] Fetching all ad sets`);
      const { data: allAdSets, error: adSetsError2 } = await supabase
        .from('meta_adsets')
        .select('*')
        .eq('brand_id', brandId);

      if (adSetsError2) {
        console.error('[Total Meta Budget] Error fetching all ad sets:', adSetsError2);
        adSetsError = adSetsError2;
      } else {
        adSets = allAdSets || [];
        console.log(`[Total Meta Budget] Found ${adSets.length} total ad sets`);
      }
    }
    
    // Calculate total daily budget
    let totalDailyBudget = 0;
    let totalLifetimeBudget = 0;
    
    if (adSets && adSets.length > 0) {
      // Sum up daily budgets
      totalDailyBudget = adSets
        .filter(adSet => adSet.budget_type === 'daily')
        .reduce((sum, adSet) => {
          const budget = parseFloat(adSet.budget) || 0;
          console.log(`[Total Meta Budget] Adding daily budget: $${budget} from ad set ${adSet.adset_name || adSet.id}`);
          return sum + budget;
        }, 0);
      
      // Sum up lifetime budgets
      totalLifetimeBudget = adSets
        .filter(adSet => adSet.budget_type === 'lifetime')
        .reduce((sum, adSet) => {
          const budget = parseFloat(adSet.budget) || 0;
          console.log(`[Total Meta Budget] Adding lifetime budget: $${budget} from ad set ${adSet.adset_name || adSet.id}`);
          return sum + budget;
        }, 0);
    }
    
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

    console.log(`[Total Meta Budget] Database result:`, JSON.stringify(finalResult, null, 2));

    return NextResponse.json(finalResult, { status: 200 });
  } catch (error: any) {
    console.error('Error in total budget endpoint:', error);
    
    return NextResponse.json(
      { error: 'Failed to calculate total budget', details: error.message },
      { status: 500 }
    );
  }
} 