import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs';
import { withMetaRateLimit } from '@/lib/services/meta-rate-limiter';
import { metaSyncValidator } from '@/lib/services/meta-sync-validator';

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
    
    // 🚨 FORCE META API SYNC: Database has stale budget amounts, need fresh data
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

        // AUTO-SYNC VALIDATION: Only run if we haven't fetched fresh data recently
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const { data: recentUpdates } = await supabase
          .from('meta_campaigns')
          .select('updated_at')
          .eq('brand_id', brandId)
          .gte('updated_at', oneHourAgo.toISOString())
          .limit(1);
        
        if (!recentUpdates || recentUpdates.length === 0) {
          console.log('[Total Meta Budget] No recent updates, running auto-sync validation...');
          try {
            const syncResult = await metaSyncValidator.checkAndAutoSync(brandId);
            if (syncResult.syncTriggered) {
              console.log(`[Total Meta Budget] Auto-sync completed: ${syncResult.message}`);
            }
          } catch (syncError) {
            console.warn('[Total Meta Budget] Auto-sync warning (non-blocking):', syncError);
            // Don't fail the request if sync validation fails - it's non-critical
          }
        } else {
          console.log('[Total Meta Budget] Recent updates found, skipping auto-sync');
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
          
          // First, validate we have an access token
          const accessToken = connectionData.access_token;
          if (!accessToken) {
            throw new Error('No access token found for Meta connection');
          }
          
          // Get account ID from metadata or extract from a test call
          let accountId = 'unknown';
          try {
            if (connectionData.metadata && connectionData.metadata.account_id) {
              accountId = connectionData.metadata.account_id;
            } else {
              // If no metadata, try to get account ID from a simple me call
              console.log('[Total Meta Budget] No account ID in metadata, fetching from Meta API...');
              const meResponse = await fetch(`https://graph.facebook.com/v18.0/me/adaccounts?access_token=${accessToken}&fields=id&limit=1`);
              if (meResponse.ok) {
                const meData = await meResponse.json();
                if (meData.data?.[0]?.id) {
                  accountId = meData.data[0].id.replace('act_', ''); // Remove act_ prefix if present
                }
              }
            }
          } catch (error) {
            console.log('[Total Meta Budget] Could not determine account ID, using fallback');
          }
          
          console.log(`[Total Meta Budget] Using account ID: ${accountId}`);
          
          // DIRECT META API CALL - bypass rate limiter for budget data
          console.log(`[Total Meta Budget] Making direct Meta API call for ad sets...`);
          const response = await fetch(
            `https://graph.facebook.com/v18.0/act_${accountId}/adsets?access_token=${accessToken}&fields=id,name,campaign_id,status,daily_budget,lifetime_budget,budget_remaining&limit=1000`,
            { 
              method: 'GET',
              headers: {
                'Cache-Control': 'no-cache'
              }
            }
          );

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Total Meta Budget] Meta API error ${response.status}:`, errorText);
            throw new Error(`Meta API error: ${response.status} - ${errorText}`);
          }

          const adSetsResponse = await response.json();
          
          if (adSetsResponse?.data) {
            console.log(`[Total Meta Budget] Successfully fetched ${adSetsResponse.data.length} adsets from Meta API`);
            
            // Update database with fresh Meta API data
            for (const adset of adSetsResponse.data) {
              if (activeOnly && adset.status !== 'ACTIVE') continue;
              
              activeAdSetCount++;
              
              let adsetBudget = 0;
              let budgetType = 'unknown';
              
              if (adset.daily_budget) {
                adsetBudget = parseFloat(adset.daily_budget) / 100; // Convert from cents
                budgetType = 'daily';
                totalDailyBudget += adsetBudget;
              } else if (adset.lifetime_budget) {
                adsetBudget = parseFloat(adset.lifetime_budget) / 100; // Convert from cents
                budgetType = 'lifetime';
                totalLifetimeBudget += adsetBudget;
              }
              
              // Update ad set in database with fresh Meta API data
              if (adsetBudget > 0) {
                console.log(`[Total Meta Budget] Updating ad set ${adset.id} with budget $${adsetBudget} (${budgetType})`);
                await supabase
                  .from('meta_adsets')
                  .update({
                    budget: adsetBudget,
                    budget_type: budgetType,
                    status: adset.status,
                    updated_at: new Date().toISOString()
                  })
                  .eq('adset_id', adset.id)
                  .eq('brand_id', brandId);
              }
            }
            
            // Update campaign with calculated ad set budget total (ACTIVE ad sets only)
            if (campaigns && campaigns.length > 0) {
              for (const campaign of campaigns) {
                // Only count ACTIVE ad sets for campaign budget total
                const campaignAdSets = adSetsResponse.data.filter(adset => 
                  adset.campaign_id === campaign.campaign_id && adset.status === 'ACTIVE'
                );
                const campaignBudgetTotal = campaignAdSets.reduce((sum, adset) => {
                  const dailyBudget = adset.daily_budget ? parseFloat(adset.daily_budget) / 100 : 0;
                  const lifetimeBudget = adset.lifetime_budget ? parseFloat(adset.lifetime_budget) / 100 : 0;
                  return sum + Math.max(dailyBudget, lifetimeBudget);
                }, 0);
                
                console.log(`[Total Meta Budget] Campaign ${campaign.campaign_id}: Found ${campaignAdSets.length} ACTIVE ad sets with total budget $${campaignBudgetTotal}`);
                
                if (campaignBudgetTotal > 0) {
                  console.log(`[Total Meta Budget] Updating campaign ${campaign.campaign_id} with adset_budget_total $${campaignBudgetTotal}`);
                  await supabase
                    .from('meta_campaigns')
                    .update({
                      budget: campaignBudgetTotal,
                      adset_budget_total: campaignBudgetTotal,
                      budget_type: 'daily', // Assume daily for now
                      budget_source: 'adsets',
                      updated_at: new Date().toISOString()
                    })
                    .eq('campaign_id', campaign.campaign_id)
                    .eq('brand_id', brandId);
                }
              }
            }
            
            console.log(`[Total Meta Budget] Calculated totals - Daily: $${totalDailyBudget.toFixed(2)}, Lifetime: $${totalLifetimeBudget.toFixed(2)}, Active AdSets: ${activeAdSetCount}`);
            
            return NextResponse.json({
              success: true,
              totalDailyBudget: parseFloat(totalDailyBudget.toFixed(2)),
              totalLifetimeBudget: parseFloat(totalLifetimeBudget.toFixed(2)),
              totalBudget: parseFloat((totalDailyBudget + totalLifetimeBudget).toFixed(2)),
              adSetCount: activeAdSetCount,
              dailyBudgetAdSetCount: adSetsResponse.data.filter(a => a.daily_budget && parseFloat(a.daily_budget) > 0).length,
              lifetimeBudgetAdSetCount: adSetsResponse.data.filter(a => a.lifetime_budget && parseFloat(a.lifetime_budget) > 0).length,
              timestamp: new Date().toISOString(),
              refreshMethod: 'meta_api'
            });
          }
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
        
        // DEBUG: Check what statuses and budget data we actually have
        const { data: debugAdSets, error: debugError } = await supabase
          .from('meta_adsets')
          .select('adset_id, adset_name, status, budget, budget_type, daily_budget, lifetime_budget')
          .eq('brand_id', brandId)
          .in('campaign_id', campaignIds)
          .limit(5);
        
        if (!debugError && debugAdSets) {
          console.log('[Total Meta Budget] DEBUG - Sample ad sets with all budget fields:');
          debugAdSets.forEach(adSet => {
            console.log(`  ${adSet.adset_name}: status=${adSet.status}, budget=${adSet.budget}, budget_type=${adSet.budget_type}, daily_budget=${adSet.daily_budget}, lifetime_budget=${adSet.lifetime_budget}`);
          });
        }
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