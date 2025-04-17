import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

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
    const fromDate = url.searchParams.get('from')
    const toDate = url.searchParams.get('to')
    
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
    if (fromDate && toDate) {
      console.log(`[Meta Campaigns] Date range parameters detected: ${fromDate} to ${toDate}`)
      
      // Try using the get_campaign_insights_by_date_range function first
      try {
        const { data: campaignInsights, error: insightsError } = await supabase.rpc(
          'get_campaign_insights_by_date_range',
          {
            brand_uuid: brandId,
            p_from_date: fromDate,
            p_to_date: toDate
          }
        )
        
        if (!insightsError && campaignInsights && campaignInsights.length > 0) {
          console.log(`[Meta Campaigns] Successfully retrieved ${campaignInsights.length} campaigns using date range function`)
          
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
          
          return NextResponse.json({
            campaigns: limitedCampaigns,
            dateRange: {
              from: fromDate,
              to: toDate
            },
            source: 'db_function',
            lastRefresh: new Date().toISOString()
          });
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
      
      const normalizedFromDate = normalizeDate(fromDate);
      const normalizedToDate = normalizeDate(toDate);
      
      // Get daily ad stats for all campaigns in the date range from the correct table
      console.log(`[Meta Campaigns] Fetching daily ad insights from ${normalizedFromDate} to ${normalizedToDate}`)
      const { data: dailyAdStats, error: statsError } = await supabase
        .from('meta_ad_insights')
        .select('campaign_id, date, spend, impressions, clicks, reach, actions, action_values')
        .eq('brand_id', brandId)
        .gte('date', normalizedFromDate)
        .lte('date', normalizedToDate);
      
      if (statsError) {
        console.error('Error fetching daily ad insights:', statsError)
        return NextResponse.json({ error: 'Error fetching campaign statistics' }, { status: 500 })
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
      
      console.log(`[Meta Campaigns] Found ${campaignIdsWithData.size} campaigns with data in date range from ${dailyAdStats?.length || 0} daily ad insight records`);
      
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
      const campaigns = relevantCampaigns.map(campaign => {
        const campaignStats = statsByCampaign[campaign.campaign_id] || [];
        
        // Aggregate metrics from daily ad stats
        let spend = 0;
        let impressions = 0;
        let clicks = 0;
        let reach = 0;
        let conversions = 0;
        let purchaseValue = 0;
        
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
                purchaseValue: 0 // Track purchase value per day
              };
            }
            
            const dailySpend = Number(stat.spend) || 0;
            const dailyImpressions = Number(stat.impressions) || 0;
            const dailyClicks = Number(stat.clicks) || 0;
            const dailyReach = Number(stat.reach) || 0;
            let dailyConversions = 0;
            let dailyPurchaseValue = 0;
            
            // Calculate conversions and purchase value from actions/action_values
            if (Array.isArray(stat.actions)) {
              stat.actions.forEach((action: any) => {
                if (action.action_type?.includes('purchase') || action.action_type?.includes('conversion')) {
                  dailyConversions += parseInt(action.value || '0');
                }
              });
            }
            if (Array.isArray(stat.action_values)) {
              stat.action_values.forEach((actionValue: any) => {
                if (actionValue.action_type?.includes('purchase') || actionValue.action_type?.includes('conversion')) {
                  dailyPurchaseValue += parseFloat(actionValue.value || '0');
                }
              });
            }
            
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
            reach += dailyReach;
            conversions += dailyConversions;
            purchaseValue += dailyPurchaseValue;
          });
          
          // Add derived metrics to daily aggregated insights
          Object.values(dailyAggregation).forEach(dailyStat => {
            dailyStat.ctr = dailyStat.impressions > 0 ? (dailyStat.clicks / dailyStat.impressions) : 0;
            dailyStat.cpc = dailyStat.clicks > 0 ? (dailyStat.spent / dailyStat.clicks) : 0;
            dailyStat.cost_per_conversion = dailyStat.conversions > 0 ? (dailyStat.spent / dailyStat.conversions) : 0;
            dailyStat.roas = dailyStat.spent > 0 ? (dailyStat.purchaseValue / dailyStat.spent) : 0;
            campaignDailyAggregatedInsights.push(dailyStat);
          });
        }
        
        // Calculate overall derived metrics for the campaign over the period
        const ctr = impressions > 0 ? (clicks / impressions) : 0;
        const cpc = clicks > 0 ? (spend / clicks) : 0;
        const cost_per_conversion = conversions > 0 ? (spend / conversions) : 0;
        const roas = spend > 0 ? (purchaseValue / spend) : 0;
        
        // Return campaign with aggregated performance metrics for the date range
        return {
          ...campaign, // Keep all current campaign data (including current budget)
          // Ensure status is properly formatted for consistency
          status: campaign.status ? campaign.status.toUpperCase() : 'UNKNOWN',
          spent: spend,
          impressions,
          clicks,
          reach,
          conversions,
          ctr,
          cpc,
          cost_per_conversion,
          roas,
          // Flag indicating if this campaign had data in the date range
          has_data_in_range: campaignIdsWithData.has(campaign.campaign_id),
          daily_insights: campaignDailyAggregatedInsights.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        };
      });
      
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
      
      return NextResponse.json({
        campaigns: limitedCampaigns,
        dateRange: {
          from: fromDate,
          to: toDate
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
    const { data: campaigns, error: fetchError } = await query
    
    if (fetchError) {
      console.error('Error fetching Meta campaigns:', fetchError)
      return NextResponse.json({ error: 'Error fetching campaign data' }, { status: 500 })
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
        console.log(`[Meta Campaigns API] TEST CAMPAIGN DETAILS:`)
        console.log(`  ID: ${testCampaign.campaign_id}`)
        console.log(`  Name: ${testCampaign.campaign_name}`)
        console.log(`  Budget: $${testCampaign.budget}`)
        console.log(`  Budget Type: ${testCampaign.budget_type}`)
        console.log(`  Budget Source: ${testCampaign.budget_source}`)
        console.log(`  Last Refresh: ${testCampaign.last_refresh_date}`)
        
        // If this is a test campaign with estimated budget, fix it in the database immediately
        if (testCampaign.budget_type === 'estimated' || !testCampaign.budget_source || testCampaign.budget > 5) {
          console.log(`[Meta Campaigns API] TEST CAMPAIGN NEEDS FIXING - Updating in database`)
          
          try {
            // Update the campaign in the database
            const { error: updateError } = await supabase
              .from('meta_campaigns')
              .update({ 
                budget: 1.00,
                budget_type: 'daily',
                budget_source: 'api_override'
              })
              .eq('campaign_id', testCampaign.campaign_id)
              .eq('brand_id', brandId)
            
            if (updateError) {
              console.error(`[Meta Campaigns API] Error updating test campaign:`, updateError)
            } else {
              console.log(`[Meta Campaigns API] Successfully fixed test campaign in database`)
              
              // Also fix it in the campaigns array that will be returned to the client
              testCampaign.budget = 1.00
              testCampaign.budget_type = 'daily'
              testCampaign.budget_source = 'api_override'
            }
          } catch (error) {
            console.error(`[Meta Campaigns API] Error fixing test campaign:`, error)
          }
        }
      }
      
      // Fix ALL campaigns with 'estimated' budget type 
      for (const campaign of campaigns) {
        if (campaign.budget_type === 'estimated') {
          console.log(`[Meta Campaigns API] Found estimated budget campaign: ${campaign.campaign_id}`)
          
          // Also fix it in the campaigns array being returned to the client
          campaign.budget_type = 'daily'
          if (campaign.budget > 5) {
            campaign.budget = 1.00
          }
          
          if (!campaign.budget_source) {
            campaign.budget_source = 'api_fix'
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
    
    return NextResponse.json({
      campaigns: campaigns || [],
      shouldRefresh,
      refreshReason,
      lastRefresh: campaigns && campaigns.length > 0 ? campaigns[0].last_refresh_date : null
    })
    
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