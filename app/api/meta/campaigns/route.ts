import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'
import { format, parseISO, differenceInDays, addDays, subDays, isValid } from 'date-fns'

export const dynamic = 'force-dynamic'

/**
 * Helper function to get the sum of reaches from ad sets for a campaign
 * This ensures consistent reach values between campaign and ad set views
 */
async function getAccurateReachFromAdSets(supabase: any, brandId: string, campaignId: string, fromDate?: string, toDate?: string) {
  try {
    // First try to get ad sets directly with their reach values
    let query = supabase
      .from('meta_adsets')
      .select('*')
      .eq('brand_id', brandId)
      .eq('campaign_id', campaignId);
    
    const { data: adSets, error } = await query;
    
    if (error || !adSets || adSets.length === 0) {
      console.log(`No ad sets found for campaign ${campaignId} - using API reach value`);
      return null;
    }
    
    // If we have date range, we need to get reach from daily insights
    if (fromDate && toDate) {
      // Get ad set IDs
      const adSetIds = adSets.map((adSet: any) => adSet.adset_id);
      
      // Get insights for these ad sets in the date range
      const { data: insights, error: insightsError } = await supabase
        .from('meta_adset_daily_insights')
        .select('*')
        .in('adset_id', adSetIds)
        .gte('date', fromDate)
        .lte('date', toDate);
      
      if (insightsError || !insights || insights.length === 0) {
        console.log(`No ad set insights found for campaign ${campaignId} in date range - using API reach value`);
        return null;
      }
      
      // Group insights by ad set
      const insightsByAdSet: Record<string, any[]> = {};
      insights.forEach((insight: any) => {
        if (!insightsByAdSet[insight.adset_id]) {
          insightsByAdSet[insight.adset_id] = [];
        }
        insightsByAdSet[insight.adset_id].push(insight);
      });
      
      // Calculate total reach as sum of ad set reaches
      let totalReach = 0;
      adSets.forEach((adSet: any) => {
        const adSetInsights = insightsByAdSet[adSet.adset_id] || [];
        const adSetReach = adSetInsights.reduce((sum: number, insight: any) => sum + Number(insight.reach || 0), 0);
        totalReach += adSetReach;
      });
      
      if (campaignId === '120218263352990058') {
        console.log(`>>> [API Campaigns] Using sum of ad set reaches for campaign ${campaignId}: ${totalReach}`);
      }
      
      return totalReach;
    } else {
      // Without date range, use the reach values directly from ad sets
      const totalReach = adSets.reduce((sum: number, adSet: any) => sum + Number(adSet.reach || 0), 0);
      
      if (campaignId === '120218263352990058') {
        console.log(`>>> [API Campaigns] Using sum of ad set reaches for campaign ${campaignId}: ${totalReach}`);
      }
      
      return totalReach;
    }
  } catch (error) {
    console.error(`Error getting accurate reach for campaign ${campaignId}:`, error);
    return null;
  }
}

/**
 * API endpoint to get Meta campaign data
 * Returns campaigns from the meta_campaigns table
 * If date range parameters are provided, it uses date range filtering
 * for more accurate filtering by date
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const url = new URL(request.url)
    const brandId = url.searchParams.get('brandId')
    const forceRefresh = url.searchParams.get('forceRefresh') === 'true'
    const status = url.searchParams.get('status')
    const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : 50
    const sortBy = url.searchParams.get('sortBy') || 'spent'
    const sortOrder = url.searchParams.get('sortOrder') || 'desc'
    
    // Get date range parameters
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    const strictDateRange = url.searchParams.get('strict_date_range') === 'true'
    
    let startDate: Date | null = null
    let endDate: Date | null = null
    let hasDateRange = false

    if (from) {
      try {
        startDate = parseISO(from)
      } catch (error) {
        console.error("[API] Invalid 'from' date format:", from)
      }
    }
    if (to) {
      try {
        endDate = parseISO(to)
      } catch (error) {
        console.error("[API] Invalid 'to' date format:", to)
      }
    }
    
    // Set hasDateRange flag if both dates are valid
    hasDateRange = !!(startDate && endDate && isValid(startDate) && isValid(endDate))

    console.log(`[API] Received request for brand ${brandId}. Date range: ${from || 'N/A'} to ${to || 'N/A'}. Strict: ${strictDateRange}`)
    
    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    // If date range parameters are provided, use date-filtered approach
    if (from && to) {
      console.log(`[Meta Campaigns] Date range parameters detected: ${from} to ${to}`)
      
      // Check if we're requesting data for today
      const today = new Date().toISOString().split('T')[0]
      const isRequestingToday = to === today
      
      if (isRequestingToday) {
        console.log(`[Meta Campaigns] Requesting data for today (${today}) - checking for midnight boundary issues`)
      }
      
      // Try using the get_campaign_insights_by_date_range function first
      try {
        // Use the database function - it should properly handle midnight boundary cases
        const FORCE_FALLBACK = false;
        
        if (!FORCE_FALLBACK) {
        const { data: campaignInsights, error: insightsError } = await supabase.rpc(
          'get_campaign_insights_by_date_range',
          {
            brand_uuid: brandId,
            p_from_date: from,
            p_to_date: to
          }
        )
        
        if (!insightsError && campaignInsights && campaignInsights.length > 0) {
          console.log(`[Meta Campaigns] Successfully retrieved ${campaignInsights.length} campaigns using date range function`)
            
            // Debug: Log what data the database function returned
            console.log(`[Meta Campaigns DB FUNCTION DEBUG] Retrieved campaigns for date range ${from} to ${to}`);
            const testCampaignFromDB = campaignInsights.find((campaign: any) => campaign.campaign_id === '120218263352990058');
            if (testCampaignFromDB) {
              console.log(`[Meta Campaigns DB FUNCTION DEBUG] Test campaign 120218263352990058 from DB function:`);
              console.log(`  Campaign spent: ${testCampaignFromDB.spent}, impressions: ${testCampaignFromDB.impressions}, clicks: ${testCampaignFromDB.clicks}`);
              if (testCampaignFromDB.daily_insights && testCampaignFromDB.daily_insights.length > 0) {
                console.log(`  Daily insights (${testCampaignFromDB.daily_insights.length} records):`);
                testCampaignFromDB.daily_insights.forEach((insight: any) => {
                  console.log(`    Date: ${insight.date}, Spent: ${insight.spent}, Impressions: ${insight.impressions}, Clicks: ${insight.clicks}`);
                });
              } else {
                console.log(`  No daily_insights from DB function`);
              }
            }
          
          // Filter by status if provided
          let filteredCampaigns = campaignInsights;
          if (status) {
            const upperStatus = status.toUpperCase();
            filteredCampaigns = campaignInsights.filter((campaign: any) => {
              const campaignStatus = (campaign.status || '').toUpperCase();
              return campaignStatus === upperStatus;
            });
          }
          
          // Sort campaigns
          const sortedCampaigns = [...filteredCampaigns].sort((a, b) => {
            const valueA = a[sortBy] || 0;
            const valueB = b[sortBy] || 0;
            
            if (sortOrder.toLowerCase() === 'asc') {
              return valueA - valueB;
            } else {
              return valueB - valueA;
            }
          });
          
          // Apply limit
          const limitedCampaigns = limit > 0 ? sortedCampaigns.slice(0, limit) : sortedCampaigns;
          
          // Fetch recommendation data for all campaigns
          const campaignIds = limitedCampaigns.map(campaign => campaign.campaign_id);
          
          // Get the latest recommendation for each campaign
          const { data: recommendations, error: recError } = await supabase
            .from('ai_usage_logs')
            .select('metadata')
            .eq('endpoint', 'campaign_recommendations')
            .eq('brand_id', brandId)
            .in('metadata->campaignId', campaignIds)
            .order('created_at', { ascending: false });
          
          if (recError) {
            console.error('Error fetching recommendations:', recError);
          }
          
          // Create a map of campaign recommendations
          const recommendationMap = new Map<string, any>();
          
          if (recommendations) {
            // Group recommendations by campaign ID and take the latest one
            const groupedRecs = recommendations.reduce((acc: any, rec: any) => {
              const campaignId = rec.metadata?.campaignId;
              if (campaignId) {
                if (!acc[campaignId] || new Date(rec.metadata.timestamp) > new Date(acc[campaignId].metadata.timestamp)) {
                  acc[campaignId] = rec;
                }
              }
              return acc;
            }, {});
            
            // Convert to map
            Object.keys(groupedRecs).forEach(campaignId => {
              const recData = groupedRecs[campaignId];
              if (recData.metadata?.recommendation) {
                recommendationMap.set(campaignId, recData.metadata.recommendation);
              }
            });
          }
          
          // Add recommendation data to campaigns
          const campaignsWithRecommendations = limitedCampaigns.map(campaign => ({
            ...campaign,
            recommendation: recommendationMap.get(campaign.campaign_id) || null
          }));
          
          // Log debug info for our test campaign
            const testCampaign = campaignsWithRecommendations.find((campaign: any) => campaign.campaign_id === '120218263352990058');
          if (testCampaign) {
            console.log(`>>> [API Campaigns] Found test campaign 120218263352990058: ${testCampaign.campaign_name}`);
            console.log(`>>> [API Campaigns] Reach value directly from Meta API: ${testCampaign.reach}`);
            console.log(`>>> [API Campaigns] Has recommendation: ${!!testCampaign.recommendation}`);
            
            // Log insights data if available
            if (testCampaign.insights && testCampaign.insights.length > 0) {
              console.log(`>>> [API Campaigns] Insights data for campaign 120218263352990058:`);
              testCampaign.insights.forEach((insight: any) => {
                console.log(`>>>   Date: ${insight.date_start}, Reach: ${insight.reach}`);
              });
            }

            // Log daily insights if available
            if (testCampaign.daily_insights && testCampaign.daily_insights.length > 0) {
              console.log(`>>> [API Campaigns] Daily insights for campaign 120218263352990058:`);
              testCampaign.daily_insights.forEach((insight: any) => {
                console.log(`>>>   Date: ${insight.date}, Reach: ${insight.reach}`);
              });
            }
          }
          
          return NextResponse.json({
            campaigns: campaignsWithRecommendations,
            dateRange: {
              from: from,
              to: to
            },
            source: 'db_function',
            lastRefresh: new Date().toISOString()
          });
          }
        }
      } catch (functionError) {
        console.error('Error fetching campaigns by date range:', functionError)
      }
      
      // Fallback to original approach if the function fails
      // First, get ALL campaign details from meta_campaigns table regardless of status
      // This ensures we have current budget information
      const { data: campaignDetails, error: campaignError } = await supabase
        .from('meta_campaigns')
        .select('*')
        .eq('brand_id', brandId)
      
      if (campaignError) {
        console.error('Error fetching campaign details:', campaignError)
        return NextResponse.json({ error: 'Error fetching campaign data' }, { status: 500 })
      }
      
      if (!campaignDetails || campaignDetails.length === 0) {
        return NextResponse.json({ 
          campaigns: [],
          message: 'No campaigns found'
        })
      }
      
      console.log(`[Meta Campaigns] Found ${campaignDetails.length} campaigns total`)
      
      // Debug: Show the date range being used
      console.log(`[Meta Campaigns API] Date range requested: ${from} to ${to}`)
      console.log(`[Meta Campaigns API] Will fetch daily stats for this date range`)
      
      // Normalize date format to ensure consistency
      const normalizeDate = (dateStr: string): string => {
        if (!dateStr) return '';
        
        // If the date already contains a T (ISO format), extract just the date part
        if (dateStr.includes('T')) {
          return dateStr.split('T')[0];
        }
        
        // Otherwise, assume it's already in YYYY-MM-DD format
        return dateStr;
      };
      
      const normalizedFromDate = normalizeDate(from);
      const normalizedToDate = normalizeDate(to);
      
      // Get daily ad stats for all campaigns in the date range from the correct table
      console.log(`[Meta Campaigns] Fetching daily campaign stats from ${normalizedFromDate} to ${normalizedToDate}`)
      let { data: dailyAdStats, error: statsError } = await supabase
        .from('meta_campaign_daily_stats')
        .select('campaign_id, date, spend, impressions, clicks, reach, conversions, roas, purchase_count, page_view_count, add_to_cart_count, initiate_checkout_count, add_payment_info_count, view_content_count, lead_count, complete_registration_count, search_count, add_to_wishlist_count')
        .eq('brand_id', brandId)
        .gte('date', normalizedFromDate)
        .lte('date', normalizedToDate);
      
      if (statsError) {
        console.error('Error fetching daily campaign stats:', statsError)
        return NextResponse.json({ error: 'Error fetching campaign statistics' }, { status: 500 })
      }

      // Debug: Show what daily stats were found
      console.log(`[Meta Campaigns API] Found ${dailyAdStats?.length || 0} daily campaign stats for date range ${normalizedFromDate} to ${normalizedToDate}`)
      if (dailyAdStats && dailyAdStats.length > 0) {
        console.log(`[Meta Campaigns API] Sample daily stat:`, dailyAdStats[0])
      } else {
        console.log(`[Meta Campaigns API] ⚠️  NO DAILY STATS FOUND for date range ${normalizedFromDate} to ${normalizedToDate}`)
        
        // CRITICAL FIX: If specifically requesting TODAY's data and no data exists, 
        // do NOT fall back to yesterday - return zeros to ensure midnight reset behavior
        if (isRequestingToday) {
          console.log(`[Meta Campaigns API] 🌙 MIDNIGHT BOUNDARY: Requesting today's data (${today}) with no data available. Skipping fallback to preserve daily reset behavior.`)
        } else {
          // Only use fallback logic when NOT requesting today's data specifically
          console.log(`[Meta Campaigns API] Not requesting today specifically, attempting fallback data...`)
          const yesterday = new Date()
          yesterday.setDate(yesterday.getDate() - 1)
          const yesterdayStr = yesterday.toISOString().split('T')[0]
          
          const { data: yesterdayStats, error: yesterdayError } = await supabase
            .from('meta_campaign_daily_stats')
            .select('campaign_id, date, spend, impressions, clicks, reach, conversions, roas, purchase_count, page_view_count, add_to_cart_count, initiate_checkout_count, add_payment_info_count, view_content_count, lead_count, complete_registration_count, search_count, add_to_wishlist_count')
            .eq('brand_id', brandId)
            .eq('date', yesterdayStr)
            
          if (!yesterdayError && yesterdayStats && yesterdayStats.length > 0) {
            console.log(`[Meta Campaigns API] ✅ Found ${yesterdayStats.length} records for yesterday (${yesterdayStr}), using as fallback`)
            dailyAdStats = yesterdayStats
          } else {
            console.log(`[Meta Campaigns API] ❌ No data found for yesterday either (${yesterdayStr})`)
            
            // Last resort: get the most recent data available
            console.log(`[Meta Campaigns API] Attempting to get most recent data available...`)
            const { data: recentStats, error: recentError } = await supabase
              .from('meta_campaign_daily_stats')
              .select('campaign_id, date, spend, impressions, clicks, reach, conversions, roas, purchase_count, page_view_count, add_to_cart_count, initiate_checkout_count, add_payment_info_count, view_content_count, lead_count, complete_registration_count, search_count, add_to_wishlist_count')
              .eq('brand_id', brandId)
              .order('date', { ascending: false })
              .limit(100)
              
            if (!recentError && recentStats && recentStats.length > 0) {
              const mostRecentDate = recentStats[0].date
              console.log(`[Meta Campaigns API] ✅ Found ${recentStats.length} records for most recent date (${mostRecentDate}), using as fallback`)
              dailyAdStats = recentStats
            } else {
              console.log(`[Meta Campaigns API] ❌ No data found in database at all for brand ${brandId}`)
            }
          }
        }
      }
      
      // Debug: Always log the query results, even if empty
      console.log(`[Meta Campaigns DEBUG] Query to meta_campaign_daily_stats returned ${dailyAdStats?.length || 0} records for date range ${normalizedFromDate} to ${normalizedToDate}`);
      
      // Debug: Log what data we found for debugging date filtering issues
      console.log(`[Meta Campaigns DEBUG] Found ${dailyAdStats?.length || 0} daily campaign stats for date range ${normalizedFromDate} to ${normalizedToDate}`);
      
      // Handle midnight boundary case: if requesting today's data and no data exists, return zero values
      if (isRequestingToday && (!dailyAdStats || dailyAdStats.length === 0)) {
        console.log(`[Meta Campaigns] Midnight boundary detected: No data exists for today (${today}). Returning zero values instead of stale data.`);
        
        // Return campaigns with zero metrics for today
        const campaignsWithZeroMetrics = campaignDetails.map(campaign => ({
          ...campaign,
          spent: 0,
          impressions: 0,
          clicks: 0,
          reach: 0,
          conversions: 0,
          ctr: 0,
          cpc: 0,
          cost_per_conversion: 0,
          roas: 0,
          purchase_value: 0,
          has_data_in_range: false,
          daily_insights: []
        }));
        
        return NextResponse.json({
          campaigns: campaignsWithZeroMetrics,
          dateRange: {
            from: from,
            to: to
          },
          campaignsWithData: 0,
          totalCampaigns: campaignDetails.length,
          lastRefresh: new Date().toISOString(),
          source: 'midnight_boundary_zero_values',
          message: 'No data exists for today yet - returning zero values'
        });
      }
      
      // Get the set of campaign IDs that have data in this date range
      const campaignIdsWithData = new Set<string>();
      
      // Group stats by campaign
      const statsByCampaign: Record<string, any[]> = {};
      
      if (dailyAdStats) {
        dailyAdStats.forEach(stat => {
          if (!stat.campaign_id) return;
          
          // Track which campaigns have data
          campaignIdsWithData.add(stat.campaign_id);
          
          // Group by campaign
          if (!statsByCampaign[stat.campaign_id]) {
            statsByCampaign[stat.campaign_id] = [];
          }
          statsByCampaign[stat.campaign_id].push(stat);
        });
      }

      // Log campaign data summary
      console.log(`[Meta Campaigns API] ${Object.keys(statsByCampaign).length} campaigns have data, ${campaignIdsWithData.size} total campaigns with metrics`)
      
      console.log(`[Meta Campaigns] Found ${campaignIdsWithData.size} campaigns with data in date range from ${dailyAdStats?.length || 0} daily campaign stats records`);
      
      // Filter campaigns based on status if provided
      let relevantCampaigns = campaignDetails;
      if (status) {
        // Convert status to uppercase for case-insensitive matching
        const upperStatus = status.toUpperCase();
        relevantCampaigns = campaignDetails.filter(campaign => {
          // Ensure we're comparing normalized status values
          const campaignStatus = (campaign.status || '').toUpperCase();
          return campaignStatus === upperStatus;
        });
        console.log(`[Meta Campaigns] Filtered to ${relevantCampaigns.length} campaigns with status: ${upperStatus}`);
      }
      
      // Process campaigns with their aggregated stats
      let campaigns = await Promise.all(relevantCampaigns.map(async (campaign: any) => {
        const campaignStats = statsByCampaign[campaign.campaign_id] || [];
        
        // Log campaign processing
        if (campaignStats.length > 0) {
          console.log(`[Meta Campaigns API] Campaign ${campaign.campaign_id}: ${campaignStats.length} daily stats`)
        }
        
        // Aggregate metrics from daily campaign stats
        let spend = 0;
        let impressions = 0;
        let clicks = 0;
        let conversions = 0;
        let purchaseValue = 0;
        let calculatedReach = 0;
        
        // Fetch ad sets to calculate campaign budget
        let adsetBudgetTotal = 0;
        let adsetBudgetType = 'unknown';
        let fetchedFromMetaAPI = false;
        try {
          if (forceRefresh) {
            // Fetch fresh ad set data from Meta API
            console.log(`[Meta Campaigns] Force refresh - fetching ad sets for campaign ${campaign.campaign_id} from Meta API`);
            
            // Get Meta connection details
            const { data: connectionData, error: connectionError } = await supabase
              .from('platform_connections')
              .select('access_token')
              .eq('brand_id', brandId)
              .eq('platform_type', 'meta')
              .single();
              
            if (!connectionError && connectionData) {
              try {
                // Try multiple API versions in case the campaign is from an older version
                const apiVersions = ['v18.0', 'v19.0', 'v20.0', 'v21.0'];
                let adSetsResponse: Response | null = null;
                let adSetsData: any = null;
                let apiVersionUsed = '';

                for (const version of apiVersions) {
                  try {
                    const adSetsUrl = `https://graph.facebook.com/${version}/${campaign.campaign_id}/adsets?fields=id,name,status,daily_budget,lifetime_budget&access_token=${connectionData.access_token}&_=${Date.now()}`;
                    const response = await fetch(adSetsUrl, {
                      cache: 'no-store',
                      headers: {
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'Pragma': 'no-cache'
                      }
                    });

                    if (response.ok) {
                      adSetsResponse = response;
                      adSetsData = await response.json();
                      apiVersionUsed = version;
                      console.log(`[Meta Campaigns] Successfully fetched ad sets for campaign ${campaign.campaign_id} using ${version}`);
                      break;
                    } else if (response.status === 400) {
                      console.log(`[Meta Campaigns] Campaign ${campaign.campaign_id} not found in ${version}, trying next version...`);
                    } else {
                      console.log(`[Meta Campaigns] Unexpected ${response.status} error for campaign ${campaign.campaign_id} in ${version}`);
                    }
                  } catch (versionError) {
                    console.log(`[Meta Campaigns] Error with ${version} for campaign ${campaign.campaign_id}:`, versionError);
                  }
                }

                if (adSetsResponse && adSetsResponse.ok && adSetsData) {
                  console.log(`[Meta Campaigns] RAW ad sets response for campaign ${campaign.campaign_id} (API ${apiVersionUsed}):`, JSON.stringify(adSetsData, null, 2));
                  
                  if (adSetsData.data) {
                    // Log all ad sets before filtering
                    console.log(`[Meta Campaigns] All ad sets for campaign ${campaign.campaign_id}:`, 
                      adSetsData.data.map((adSet: any) => ({
                        id: adSet.id,
                        name: adSet.name,
                        status: adSet.status,
                        daily_budget: adSet.daily_budget ? parseInt(adSet.daily_budget) / 100 : null,
                        lifetime_budget: adSet.lifetime_budget ? parseInt(adSet.lifetime_budget) / 100 : null
                      }))
                    );
                    
                    // Filter for active ad sets only and calculate total budget
                    const activeAdSets = adSetsData.data.filter((adSet: any) => adSet.status === 'ACTIVE');
                    console.log(`[Meta Campaigns] Active ad sets for campaign ${campaign.campaign_id}:`, 
                      activeAdSets.map((adSet: any) => ({
                        id: adSet.id,
                        name: adSet.name,
                        status: adSet.status,
                        daily_budget: adSet.daily_budget ? parseInt(adSet.daily_budget) / 100 : null,
                        lifetime_budget: adSet.lifetime_budget ? parseInt(adSet.lifetime_budget) / 100 : null
                      }))
                    );
                    
                    adsetBudgetTotal = activeAdSets.reduce((total: number, adSet: any) => {
                      const dailyBudget = adSet.daily_budget ? parseInt(adSet.daily_budget) / 100 : 0;
                      const lifetimeBudget = adSet.lifetime_budget ? parseInt(adSet.lifetime_budget) / 100 : 0;
                      return total + Math.max(dailyBudget, lifetimeBudget);
                    }, 0);
                    
                    // Determine budget type
                    const hasDailyBudgets = activeAdSets.some((adSet: any) => adSet.daily_budget);
                    const hasLifetimeBudgets = activeAdSets.some((adSet: any) => adSet.lifetime_budget);
                    adsetBudgetType = hasDailyBudgets ? 'daily' : hasLifetimeBudgets ? 'lifetime' : 'unknown';
                    
                    console.log(`[Meta Campaigns] Campaign ${campaign.campaign_id} - Active adsets budget calculation:`, {
                      activeAdSetsCount: activeAdSets.length,
                      totalBudget: adsetBudgetTotal,
                      budgetType: adsetBudgetType
                    });
                    
                    fetchedFromMetaAPI = true;
                    
                    // Update the campaign budget in database with fresh data
                    const { error: updateError } = await supabase
                      .from('meta_campaigns')
                      .update({
                        budget: adsetBudgetTotal,
                        budget_type: adsetBudgetType,
                        budget_source: 'adsets',
                        last_refresh_date: new Date().toISOString()
                      })
                      .eq('campaign_id', campaign.campaign_id)
                      .eq('brand_id', brandId);
                      
                    if (updateError) {
                      console.error(`[Meta Campaigns] Error updating campaign ${campaign.campaign_id} budget in database:`, updateError);
                    } else {
                      console.log(`[Meta Campaigns] Successfully updated campaign ${campaign.campaign_id} budget to $${adsetBudgetTotal} in database`);
                    }
                  }
                } else {
                  console.error(`[Meta Campaigns] Failed to fetch ad sets for campaign ${campaign.campaign_id} after trying all API versions (${apiVersions.join(', ')}):`, adSetsResponse ? `${adSetsResponse.status} ${adSetsResponse.statusText}` : 'No response received');
                }
              } catch (adSetError) {
                console.error(`[Meta Campaigns] Error fetching ad sets for campaign ${campaign.campaign_id}:`, adSetError);
              }
            } else {
              console.error(`[Meta Campaigns] No Meta connection found for brand ${brandId}:`, connectionError);
            }
          }
          
          // If we didn't successfully fetch from Meta API, fall back to database
          if (!fetchedFromMetaAPI) {
            console.log(`[Meta Campaigns] Using database fallback for campaign ${campaign.campaign_id} budget`);
            // Get budget from database
            const { data: adSetsData, error: adSetsError } = await supabase
              .from('meta_adsets')
              .select('*')
              .eq('campaign_id', campaign.campaign_id)
              .eq('brand_id', brandId)
              .eq('status', 'ACTIVE');
              
            if (!adSetsError && adSetsData) {
              adsetBudgetTotal = adSetsData.reduce((total: number, adSet: any) => {
                const dailyBudget = adSet.daily_budget || 0;
                const lifetimeBudget = adSet.lifetime_budget || 0;
                return total + Math.max(dailyBudget, lifetimeBudget);
              }, 0);
              
              const hasDailyBudgets = adSetsData.some((adSet: any) => adSet.daily_budget > 0);
              const hasLifetimeBudgets = adSetsData.some((adSet: any) => adSet.lifetime_budget > 0);
              adsetBudgetType = hasDailyBudgets ? 'daily' : hasLifetimeBudgets ? 'lifetime' : 'unknown';
              
              console.log(`[Meta Campaigns] Campaign ${campaign.campaign_id} - Database adsets budget:`, {
                adSetsCount: adSetsData.length,
                totalBudget: adsetBudgetTotal,
                budgetType: adsetBudgetType
              });
            }
          }
        } catch (error) {
          console.error(`[Meta Campaigns] Error calculating budget for campaign ${campaign.campaign_id}:`, error);
        }
        
        // Collect daily insights specific to this campaign for the response
        const campaignDailyAggregatedInsights: any[] = [];
        
        if (campaignStats.length > 0) {
          // Aggregate daily stats for the campaign
          const dailyAggregation: Record<string, any> = {};
          
          campaignStats.forEach(stat => {
            const date = stat.date;
            if (!dailyAggregation[date]) {
              dailyAggregation[date] = {
                date: date,
                campaign_id: campaign.campaign_id,
                spent: 0,
                impressions: 0,
                clicks: 0,
                reach: 0,
                conversions: 0,
                purchaseValue: 0
              };
            }
            
            const dailySpend = Number(stat.spend) || 0;
            const dailyImpressions = Number(stat.impressions) || 0;
            const dailyClicks = Number(stat.clicks) || 0;
            const dailyReach = Number(stat.reach) || 0;
            const dailyConversions = Number(stat.conversions) || 0;
            // Calculate purchase value from purchase_count * estimated value (or use roas data)
            const dailyPurchaseValue = Number(stat.purchase_count) || 0;
            
            // Aggregate for the specific day
            dailyAggregation[date].spent += dailySpend;
            dailyAggregation[date].impressions += dailyImpressions;
            dailyAggregation[date].clicks += dailyClicks;
            dailyAggregation[date].reach += dailyReach;
            dailyAggregation[date].conversions += dailyConversions;
            dailyAggregation[date].purchaseValue += dailyPurchaseValue;
            
            // Aggregate for the total period
            spend += dailySpend;
            impressions += dailyImpressions;
            clicks += dailyClicks;
            calculatedReach += dailyReach;
            conversions += dailyConversions;
            purchaseValue += dailyPurchaseValue;
          });
          
          // Add derived metrics to daily aggregated insights
          Object.values(dailyAggregation).forEach(dailyStat => {
            dailyStat.ctr = dailyStat.impressions > 0 ? (dailyStat.clicks / dailyStat.impressions) * 100 : 0; // Convert to percentage
            dailyStat.cpc = dailyStat.clicks > 0 ? (dailyStat.spent / dailyStat.clicks) : 0;
            dailyStat.cost_per_conversion = dailyStat.conversions > 0 ? (dailyStat.spent / dailyStat.conversions) : 0;
            dailyStat.roas = dailyStat.spent > 0 ? (dailyStat.purchaseValue / dailyStat.spent) : 0;
            campaignDailyAggregatedInsights.push(dailyStat);
          });
        }
        
        // Calculate overall derived metrics for the campaign over the period
        const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0; // Convert to percentage
        const cpc = clicks > 0 ? (spend / clicks) : 0;
        const cost_per_conversion = conversions > 0 ? spend / conversions : 0;
        const roas = purchaseValue > 0 && spend > 0 ? purchaseValue / spend : 0;

        // Log successful metric aggregation
        console.log(`[Meta Campaigns API] Campaign ${campaign.campaign_id}: spend=$${spend}, impressions=${impressions}, clicks=${clicks}`);
        
        // Use calculated reach ONLY if a date range was specified, otherwise use the campaign's total reach
        const finalReach = hasDateRange ? calculatedReach : (Number(campaign.reach) || 0);

        // Log the reach calculation for debugging if needed
        if (campaign.campaign_id === '120218263352990058') {
            console.log(`[API Campaigns] Campaign ${campaign.campaign_id}: hasDateRange=${hasDateRange}, calculatedReach=${calculatedReach}, finalReach=${finalReach} (from ${campaignStats.length} daily records)`);
        }
        
        // Return campaign with aggregated performance metrics for the date range
        return {
          ...campaign, // Spread the original campaign data first
          spent: Number(spend.toFixed(2)),
          impressions: impressions,
          clicks: clicks,
          reach: finalReach,
          conversions: conversions,
          ctr,
          cpc,
          cost_per_conversion,
          roas,
          purchase_value: Number(purchaseValue.toFixed(2)),
          // Add the calculated ad set budget information
          adset_budget_total: adsetBudgetTotal,
          budget: adsetBudgetTotal > 0 ? adsetBudgetTotal : campaign.budget, // Use ad set total if available
          budget_type: adsetBudgetType !== 'unknown' ? adsetBudgetType : campaign.budget_type,
          budget_source: adsetBudgetTotal > 0 ? 'adsets' : campaign.budget_source,
          // Flag indicating if this campaign had data in the date range
          has_data_in_range: campaignIdsWithData.has(campaign.campaign_id),
          daily_insights: campaignDailyAggregatedInsights.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        };
      }));
      
      // Sort campaigns based on the specified metric
      const sortedCampaigns = [...campaigns].sort((a, b) => {
        // When using date range, prioritize campaigns with data
        if (a.has_data_in_range && !b.has_data_in_range) return -1;
        if (!a.has_data_in_range && b.has_data_in_range) return 1;
        
        // Then apply the normal sorting
        const valueA = a[sortBy] || 0;
        const valueB = b[sortBy] || 0;
        
        if (sortOrder.toLowerCase() === 'asc') {
          return valueA - valueB;
        } else {
          return valueB - valueA;
        }
      });
      
      // Apply limit if specified
      const limitedCampaigns = limit > 0 ? sortedCampaigns.slice(0, limit) : sortedCampaigns;
      
      // Fetch recommendation data for all campaigns
      const campaignIds = limitedCampaigns.map(campaign => campaign.campaign_id);
      
      // Get the latest recommendation for each campaign
      const { data: recommendations, error: recError } = await supabase
        .from('ai_usage_logs')
        .select('metadata')
        .eq('endpoint', 'campaign_recommendations')
        .eq('brand_id', brandId)
        .in('metadata->campaignId', campaignIds)
        .order('created_at', { ascending: false });
      
      if (recError) {
        console.error('Error fetching recommendations:', recError);
      }
      
      // Create a map of campaign recommendations
      const recommendationMap = new Map<string, any>();
      
      if (recommendations) {
        // Group recommendations by campaign ID and take the latest one
        const groupedRecs = recommendations.reduce((acc: any, rec: any) => {
          const campaignId = rec.metadata?.campaignId;
          if (campaignId) {
            if (!acc[campaignId] || new Date(rec.metadata.timestamp) > new Date(acc[campaignId].metadata.timestamp)) {
              acc[campaignId] = rec;
            }
          }
          return acc;
        }, {});
        
        // Convert to map
        Object.keys(groupedRecs).forEach(campaignId => {
          const recData = groupedRecs[campaignId];
          if (recData.metadata?.recommendation) {
            recommendationMap.set(campaignId, recData.metadata.recommendation);
          }
        });
      }
      
      // Add recommendation data to campaigns
      const campaignsWithRecommendations = limitedCampaigns.map(campaign => ({
        ...campaign,
        recommendation: recommendationMap.get(campaign.campaign_id) || null
      }));
      
      // Log debug info for our test campaign
      const testCampaign = campaignsWithRecommendations.find((campaign: any) => campaign.campaign_id === '120218263352990058');
      if (testCampaign) {
        console.log(`>>> [API Campaigns] Found test campaign 120218263352990058: ${testCampaign.campaign_name}`);
        console.log(`>>> [API Campaigns] Reach value calculated from daily stats: ${testCampaign.reach}`); // New log
        console.log(`>>> [API Campaigns] Has recommendation: ${!!testCampaign.recommendation}`);
        
        // Log insights data if available
        if (testCampaign.insights && testCampaign.insights.length > 0) {
          console.log(`>>> [API Campaigns] Insights data for campaign 120218263352990058:`);
          testCampaign.insights.forEach((insight: any) => {
            console.log(`>>>   Date: ${insight.date_start}, Reach: ${insight.reach}`);
          });
        }

        // Log daily insights if available
        if (testCampaign.daily_insights && testCampaign.daily_insights.length > 0) {
          console.log(`>>> [API Campaigns] Daily insights for campaign 120218263352990058:`);
          testCampaign.daily_insights.forEach((insight: any) => {
            console.log(`>>>   Date: ${insight.date}, Reach: ${insight.reach}`);
          });
        }
      }
      
      return NextResponse.json({
        campaigns: campaignsWithRecommendations,
        dateRange: {
          from: from,
          to: to
        },
        campaignsWithData: campaignIdsWithData.size,
        totalCampaigns: campaignDetails.length,
        lastRefresh: new Date().toISOString()
      });
    }

    // For non-date range requests, use the standard campaign fetching logic
    console.log(`[Meta Campaigns] Fetching campaigns for brand ${brandId}`)
    
    // Build query
    let query = supabase
      .from('meta_campaigns')
      .select('*')
      .eq('brand_id', brandId)
    
    // Add status filter if provided
    if (status) {
      query = query.eq('status', status.toUpperCase())
    }
    
    // Add sorting
    if (sortBy && sortOrder) {
      query = query.order(sortBy, { ascending: sortOrder.toLowerCase() === 'asc' })
    }
    
    // Add limit
    if (limit > 0) {
      query = query.limit(limit)
    }
    
    // Execute query
    let { data: campaigns, error: fetchError } = await query
    
    if (fetchError) {
      console.error('Error fetching Meta campaigns:', fetchError)
      return NextResponse.json({ error: 'Error fetching campaign data' }, { status: 500 })
    }
    
    // Handle null campaigns
    if (!campaigns) {
      campaigns = []
    }
    
    // Log campaign budget info for debugging
    if (campaigns && campaigns.length > 0) {
      console.log(`[Meta Campaigns API] Found ${campaigns.length} campaigns for brand ${brandId}`)
      
      // Find the test campaign and log its budget details
      const testCampaign = campaigns.find(c => 
        c.campaign_id === '120218263352990058' || 
        c.campaign_name.includes('TEST - DO NOT USE')
      )
      
      if (testCampaign) {
        console.log(`[Meta Campaigns API] TEST CAMPAIGN DETAILS:`);
        console.log(`  ID: ${testCampaign.campaign_id}`);
        console.log(`  Name: ${testCampaign.campaign_name}`);
        console.log(`  Budget: $${testCampaign.budget}`);
        console.log(`  Budget Type: ${testCampaign.budget_type}`);
        console.log(`  Budget Source: ${testCampaign.budget_source}`);
        console.log(`  Last Refresh: ${testCampaign.last_refresh_date}`);
      }
        
      // If forceRefresh was used, re-query campaigns to get the updated budget values
      if (forceRefresh) {
        console.log(`[Meta Campaigns] Force refresh complete, re-querying campaigns from database to get updated budget values`);
        
        const { data: updatedCampaigns, error: updatedError } = await supabase
              .from('meta_campaigns')
          .select(`
            campaign_id,
            campaign_name,
            status,
            objective,
            budget,
            budget_type,
            budget_source,
            spend_cap,
            account_id,
            brand_id,
            created_time,
            updated_time,
            last_refresh_date,
            adset_budget_total
          `)
              .eq('brand_id', brandId)
          .order('updated_time', { ascending: false });
          
        if (!updatedError && updatedCampaigns) {
          campaigns = updatedCampaigns;
          console.log(`[Meta Campaigns] Successfully re-queried ${campaigns.length} campaigns with updated budget data`);
          
          // Log updated test campaign data
          const updatedTestCampaign = campaigns.find(c => 
            c.campaign_id === '120218263352990058' || 
            c.campaign_name.includes('TEST - DO NOT USE')
          );
          
          if (updatedTestCampaign) {
            console.log(`[Meta Campaigns API] UPDATED TEST CAMPAIGN DETAILS:`);
            console.log(`  ID: ${updatedTestCampaign.campaign_id}`);
            console.log(`  Name: ${updatedTestCampaign.campaign_name}`);
            console.log(`  Budget: $${updatedTestCampaign.budget}`);
            console.log(`  Adset Budget Total: $${updatedTestCampaign.adset_budget_total}`);
            console.log(`  Budget Type: ${updatedTestCampaign.budget_type}`);
            console.log(`  Budget Source: ${updatedTestCampaign.budget_source}`);
            console.log(`  Last Refresh: ${updatedTestCampaign.last_refresh_date}`);
          }
        }
      }
    }
    
    // Check if we need to refresh data (if no campaigns or data is old)
    let shouldRefresh = false
    let refreshReason = ''
    
    if (!campaigns || campaigns.length === 0) {
      shouldRefresh = true
      refreshReason = 'No campaigns found'
    } else {
      const now = new Date()
      const oneDayAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000))
      
      // Check if the data is older than a day
      const oldestRefresh = campaigns.reduce((oldest, campaign) => {
        const refreshDate = new Date(campaign.last_refresh_date)
        return refreshDate < oldest ? refreshDate : oldest
      }, new Date())
      
      if (oldestRefresh < oneDayAgo) {
        shouldRefresh = true
        refreshReason = 'Data is older than 24 hours'
      }
    }
    
         // After fetching campaigns, aggregate ad set budgets for each campaign
     const campaignsWithBudgets = await Promise.all(campaigns.map(async (campaign: any) => {
       // Fetch ad sets to calculate campaign budget
       let adsetBudgetTotal = 0;
       let adsetBudgetType = 'unknown';
       let fetchedFromMetaAPI = false;
       try {
         if (forceRefresh) {
           // Fetch fresh ad set data from Meta API
           console.log(`[Meta Campaigns] Force refresh - fetching ad sets for campaign ${campaign.campaign_id} from Meta API`);
           
           // Get Meta connection details
           const { data: connectionData, error: connectionError } = await supabase
             .from('platform_connections')
             .select('access_token')
             .eq('brand_id', brandId)
             .eq('platform', 'meta')
             .single();
             
           if (!connectionError && connectionData) {
             try {
               const adSetsUrl = `https://graph.facebook.com/v21.0/${campaign.campaign_id}/adsets?fields=id,name,status,daily_budget,lifetime_budget&access_token=${connectionData.access_token}&_=${Date.now()}`;
               const adSetsResponse = await fetch(adSetsUrl, {
                 cache: 'no-store',
                 headers: {
                   'Cache-Control': 'no-cache, no-store, must-revalidate',
                   'Pragma': 'no-cache'
                 }
               });
               
               if (adSetsResponse.ok) {
                 const adSetsData = await adSetsResponse.json();
                 console.log(`[Meta Campaigns] RAW ad sets response for campaign ${campaign.campaign_id}:`, JSON.stringify(adSetsData, null, 2));
                 
                 if (adSetsData.data) {
                   // Log all ad sets before filtering
                   console.log(`[Meta Campaigns] All ad sets for campaign ${campaign.campaign_id}:`, 
                     adSetsData.data.map((adSet: any) => ({
                       id: adSet.id,
                       name: adSet.name,
                       status: adSet.status,
                       daily_budget: adSet.daily_budget ? parseInt(adSet.daily_budget) / 100 : null,
                       lifetime_budget: adSet.lifetime_budget ? parseInt(adSet.lifetime_budget) / 100 : null
                     }))
                   );
                   
                   // Filter for active ad sets only and calculate total budget
                   const activeAdSets = adSetsData.data.filter((adSet: any) => adSet.status === 'ACTIVE');
                   console.log(`[Meta Campaigns] Active ad sets for campaign ${campaign.campaign_id}:`, 
                     activeAdSets.map((adSet: any) => ({
                       id: adSet.id,
                       name: adSet.name,
                       status: adSet.status,
                       daily_budget: adSet.daily_budget ? parseInt(adSet.daily_budget) / 100 : null,
                       lifetime_budget: adSet.lifetime_budget ? parseInt(adSet.lifetime_budget) / 100 : null
                     }))
                   );
                   
                   adsetBudgetTotal = activeAdSets.reduce((total: number, adSet: any) => {
                     const dailyBudget = adSet.daily_budget ? parseInt(adSet.daily_budget) / 100 : 0;
                     const lifetimeBudget = adSet.lifetime_budget ? parseInt(adSet.lifetime_budget) / 100 : 0;
                     return total + Math.max(dailyBudget, lifetimeBudget);
                   }, 0);
                   
                   // Determine budget type
                   const hasDailyBudgets = activeAdSets.some((adSet: any) => adSet.daily_budget);
                   const hasLifetimeBudgets = activeAdSets.some((adSet: any) => adSet.lifetime_budget);
                   adsetBudgetType = hasDailyBudgets ? 'daily' : hasLifetimeBudgets ? 'lifetime' : 'unknown';
                   
                   console.log(`[Meta Campaigns] Campaign ${campaign.campaign_id} - Active adsets budget calculation:`, {
                     activeAdSetsCount: activeAdSets.length,
                     totalBudget: adsetBudgetTotal,
                     budgetType: adsetBudgetType
                   });
                   
                   fetchedFromMetaAPI = true;
                   
                   // Update the campaign budget in database with fresh data
                   const { error: updateError } = await supabase
                     .from('meta_campaigns')
                     .update({
                       budget: adsetBudgetTotal,
                       budget_type: adsetBudgetType,
                       budget_source: 'adsets',
                       last_refresh_date: new Date().toISOString()
                     })
                     .eq('campaign_id', campaign.campaign_id)
                     .eq('brand_id', brandId);
                     
                   if (updateError) {
                     console.error(`[Meta Campaigns] Error updating campaign ${campaign.campaign_id} budget in database:`, updateError);
                   } else {
                     console.log(`[Meta Campaigns] Successfully updated campaign ${campaign.campaign_id} budget to $${adsetBudgetTotal} in database`);
                   }
                 }
               } else {
                 console.error(`[Meta Campaigns] Failed to fetch ad sets for campaign ${campaign.campaign_id}:`, adSetsResponse.status, adSetsResponse.statusText);
               }
             } catch (adSetError) {
               console.error(`[Meta Campaigns] Error fetching ad sets for campaign ${campaign.campaign_id}:`, adSetError);
             }
           } else {
             console.error(`[Meta Campaigns] No Meta connection found for brand ${brandId}:`, connectionError);
           }
         }
         
         // If we didn't successfully fetch from Meta API, fall back to database
         if (!fetchedFromMetaAPI) {
           console.log(`[Meta Campaigns] Using database fallback for campaign ${campaign.campaign_id} budget`);
           // Get budget from database
           const { data: adSetsData, error: adSetsError } = await supabase
             .from('meta_adsets')
             .select('*')
             .eq('campaign_id', campaign.campaign_id)
             .eq('brand_id', brandId)
             .eq('status', 'ACTIVE');
             
           if (!adSetsError && adSetsData) {
             adsetBudgetTotal = adSetsData.reduce((total: number, adSet: any) => {
               const dailyBudget = adSet.daily_budget || 0;
               const lifetimeBudget = adSet.lifetime_budget || 0;
               return total + Math.max(dailyBudget, lifetimeBudget);
             }, 0);
             
             const hasDailyBudgets = adSetsData.some((adSet: any) => adSet.daily_budget > 0);
             const hasLifetimeBudgets = adSetsData.some((adSet: any) => adSet.lifetime_budget > 0);
             adsetBudgetType = hasDailyBudgets ? 'daily' : hasLifetimeBudgets ? 'lifetime' : 'unknown';
             
             console.log(`[Meta Campaigns] Campaign ${campaign.campaign_id} - Database adsets budget:`, {
               adSetsCount: adSetsData.length,
               totalBudget: adsetBudgetTotal,
               budgetType: adsetBudgetType
             });
           }
         }
       } catch (error) {
         console.error(`[Meta Campaigns] Error calculating budget for campaign ${campaign.campaign_id}:`, error);
       }
      
      return {
        ...campaign,
        adset_budget_total: adsetBudgetTotal,
        budget: adsetBudgetTotal > 0 ? adsetBudgetTotal : campaign.budget,
        budget_type: adsetBudgetType !== 'unknown' ? adsetBudgetType : campaign.budget_type,
        budget_source: adsetBudgetTotal > 0 ? 'adsets' : campaign.budget_source
      };
    }));
    
    // After all campaigns are processed in the GET handler
    const finalCampaigns = campaignsWithBudgets;

    // Fetch recommendation data for all campaigns
    const campaignIds = finalCampaigns.map(campaign => campaign.campaign_id);
    
    // Get the latest recommendation for each campaign
    const { data: recommendations, error: recError } = await supabase
      .from('ai_usage_logs')
      .select('metadata')
      .eq('endpoint', 'campaign_recommendations')
      .eq('brand_id', brandId)
      .in('metadata->campaignId', campaignIds)
      .order('created_at', { ascending: false });
    
    if (recError) {
      console.error('Error fetching recommendations:', recError);
    }
    
    // Create a map of campaign recommendations
    const recommendationMap = new Map<string, any>();
    
    if (recommendations) {
      // Group recommendations by campaign ID and take the latest one
      const groupedRecs = recommendations.reduce((acc: any, rec: any) => {
        const campaignId = rec.metadata?.campaignId;
        if (campaignId) {
          if (!acc[campaignId] || new Date(rec.metadata.timestamp) > new Date(acc[campaignId].metadata.timestamp)) {
            acc[campaignId] = rec;
          }
        }
        return acc;
      }, {});
      
      // Convert to map
      Object.keys(groupedRecs).forEach(campaignId => {
        const recData = groupedRecs[campaignId];
        if (recData.metadata?.recommendation) {
          recommendationMap.set(campaignId, recData.metadata.recommendation);
        }
      });
    }
    
    // Add recommendation data to campaigns
    const campaignsWithRecommendations = finalCampaigns.map(campaign => ({
      ...campaign,
      recommendation: recommendationMap.get(campaign.campaign_id) || null
    }));

    // Log debug info for our test campaign
    const testCampaignFinal = campaignsWithRecommendations.find(campaign => campaign.campaign_id === '120218263352990058');
    if (testCampaignFinal) {
      console.log(`>>> [API Campaigns] Found test campaign 120218263352990058: ${testCampaignFinal.campaign_name}`);
      console.log(`>>> [API Campaigns] Has recommendation: ${!!testCampaignFinal.recommendation}`);
    }

    return NextResponse.json({
      campaigns: campaignsWithRecommendations,
      shouldRefresh,
      refreshReason,
      lastRefresh: campaignsWithRecommendations && campaignsWithRecommendations.length > 0 ? campaignsWithRecommendations[0].last_refresh_date : null
    });
  } catch (error) {
    console.error('[Meta Campaigns] Error in campaigns endpoint:', error)
    return NextResponse.json({ 
      error: 'Server error', 
      details: typeof error === 'object' && error !== null && 'message' in error 
        ? (error.message as string) 
        : 'Unknown error'
    }, { status: 500 })
  }
}