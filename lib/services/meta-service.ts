import { createClient } from '@supabase/supabase-js'

/**
 * Fetches Meta ad insights for a specific brand within a date range
 * 
 * NOTE: As of the latest update, this function pulls data with time_increment=1,
 * which means each record represents a single day's worth of data for a given ad.
 * This allows for proper date-based filtering in the dashboard.
 * 
 * Previously, data was being aggregated into a single date for the entire period,
 * which made it impossible to show proper date range metrics.
 */

// Helper function to delay execution (for rate limiting)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to perform API call with retries and exponential backoff
async function fetchWithRetry(url: string, options = {}, maxRetries = 3, initialBackoff = 5000) {
  let retries = 0;
  let backoff = initialBackoff;
  
  while (retries <= maxRetries) {
    try {
      const response = await fetch(url, options);
      const data = await response.json();
      
      // Check if we hit rate limiting
      if (data.error && (data.error.code === 80004 || data.error.message?.includes('too many calls'))) {
        if (retries >= maxRetries) {
          console.log(`[Meta] Rate limit exceeded after ${retries} retries. Returning rate limit error.`);
          return data;
        }
        
        retries++;
        console.log(`[Meta] Rate limit hit, retrying in ${backoff/1000}s (retry ${retries}/${maxRetries})`);
        await delay(backoff);
        backoff *= 2; // Exponential backoff
        continue;
      }
      
      return data;
    } catch (error) {
      if (retries >= maxRetries) {
        console.log(`[Meta] API call failed after ${retries} retries.`);
        throw error;
      }
      
      retries++;
      console.log(`[Meta] API call failed, retrying in ${backoff/1000}s (retry ${retries}/${maxRetries})`);
      await delay(backoff);
      backoff *= 2; // Exponential backoff
    }
  }
  
  throw new Error(`Failed after ${maxRetries} retries`);
}

// Helper function to ensure ad_account_id is in the metadata
async function ensureAdAccountId(connection: any, brandId: string, supabase: any) {
  // If connection already has ad_account_id, we're good
  if (connection.metadata && connection.metadata.ad_account_id) {
    return connection.metadata.ad_account_id;
  }
  
  console.log(`[Meta] No ad_account_id found in metadata for brand ${brandId}, attempting to fetch it`);
  
  try {
    // Fetch ad accounts from Meta
    const accountsData = await fetchWithRetry(
      `https://graph.facebook.com/v18.0/me/adaccounts?fields=name,account_id&access_token=${connection.access_token}`
    );
    
    if (accountsData.error) {
      console.error(`[Meta] Error fetching ad accounts:`, accountsData.error);
      return null;
    }
    
    if (!accountsData.data || accountsData.data.length === 0) {
      console.log(`[Meta] No ad accounts found for brand ${brandId}`);
      return null;
    }
    
    // Use the first ad account
    const firstAccount = accountsData.data[0];
    const accountId = firstAccount.account_id || firstAccount.id.replace('act_', '');
    const adAccountId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
    
    console.log(`[Meta] Found ad account id: ${adAccountId}, updating connection metadata`);
    
    // Update the connection with the ad_account_id
    const updatedMetadata = {
      ...(connection.metadata || {}),
      ad_account_id: adAccountId
    };
    
    // Update the platform_connections table
    const { error: updateError } = await supabase
      .from('platform_connections')
      .update({ metadata: updatedMetadata })
      .eq('id', connection.id);
    
    if (updateError) {
      console.error(`[Meta] Error updating connection metadata:`, updateError);
    } else {
      console.log(`[Meta] Updated connection ${connection.id} with ad_account_id: ${adAccountId}`);
      // Update the local connection object as well
      connection.metadata = updatedMetadata;
    }
    
    return adAccountId;
  } catch (error) {
    console.error(`[Meta] Error ensuring ad_account_id:`, error);
    return null;
  }
}

export async function fetchMetaAdInsights(
  brandId: string, 
  startDate: Date, 
  endDate: Date,
  dryRun: boolean = false
) {
  console.log(`[Meta] Initiating sync for brand ${brandId} from ${startDate.toISOString()} to ${endDate.toISOString()}${dryRun ? ' (dry run)' : ''}`)
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    // Find the Meta connection for this brand
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')
      .eq('status', 'active')
      .single()

    if (connectionError || !connection) {
      console.error(`[Meta] Error finding Meta connection for brand ${brandId}:`, connectionError)
      return { 
        success: false, 
        error: 'No active Meta connection found' 
      }
    }

    // Ensure we have an ad account ID in the metadata
    await ensureAdAccountId(connection, brandId, supabase);

    // Fetch ad accounts with retry mechanism
    const accountsData = await fetchWithRetry(
      `https://graph.facebook.com/v18.0/me/adaccounts?fields=name,account_id&access_token=${connection.access_token}`
    );
    
    if (accountsData.error) {
      console.error(`[Meta] Error fetching ad accounts:`, accountsData.error)
      
      // Check if this is a rate limiting error
      if (accountsData.error.code === 80004 || accountsData.error.message?.includes('too many calls')) {
        console.log(`[Meta] Rate limit hit, attempting to use cached data`);
        
        // Try to return cached data instead
        const { data: cachedInsights } = await supabase
          .from('meta_ad_insights')
          .select('*')
          .eq('brand_id', brandId)
          .gte('date', startDate.toISOString().split('T')[0])
          .lte('date', endDate.toISOString().split('T')[0]);
          
        if (cachedInsights && cachedInsights.length > 0) {
          console.log(`[Meta] Using ${cachedInsights.length} cached insights due to rate limiting`);
          return { 
            success: true, 
            message: 'Using cached insights due to Meta API rate limit',
            count: cachedInsights.length,
            rateLimited: true
          }
        }
      }
      
      return { 
        success: false, 
        error: 'Failed to fetch Meta ad accounts',
        details: accountsData.error
      }
    }

    if (!accountsData.data || accountsData.data.length === 0) {
      console.log(`[Meta] No ad accounts found for brand ${brandId}`)
      return { 
        success: false, 
        error: 'No Meta ad accounts found for this connection' 
      }
    }

    console.log(`[Meta] Found ${accountsData.data.length} ad accounts`)
    
    // Format dates for the API
    const startDateStr = startDate.toISOString().split('T')[0]
    const endDateStr = endDate.toISOString().split('T')[0]

    let allInsights = []
    let campaignBudgets = new Map()
    
    // For each ad account, fetch insights - with rate limit handling
    for (const account of accountsData.data) {
      console.log(`[Meta] Fetching insights for account ${account.name} (${account.id})`)
      
      try {
        // Add delay between requests to avoid rate limiting
        await delay(1000);
        
        // First fetch campaign information to get budgets - with retry
        const campaignsData = await fetchWithRetry(
          `https://graph.facebook.com/v18.0/${account.id}/campaigns?fields=id,name,daily_budget,lifetime_budget,effective_status&access_token=${connection.access_token}`
        );
        
        if (campaignsData.error) {
          console.error(`[Meta] Error fetching campaigns for account ${account.id}:`, campaignsData.error);
          continue;
        }
        
        if (campaignsData.data && campaignsData.data.length > 0) {
          for (const campaign of campaignsData.data) {
            let totalBudget = 0
            
            // Add daily budget (converted from cents to dollars)
            if (campaign.daily_budget) {
              const dailyBudget = parseFloat(campaign.daily_budget) / 100
              totalBudget += dailyBudget
            }
            
            // Add lifetime budget (converted from cents to dollars) 
            if (campaign.lifetime_budget) {
              const lifetimeBudget = parseFloat(campaign.lifetime_budget) / 100
              totalBudget += lifetimeBudget
            }
            
            // Store budget for this campaign
            campaignBudgets.set(campaign.id, totalBudget)
          }
          
          console.log(`[Meta] Fetched budget info for ${campaignsData.data.length} campaigns`)
        }
        
        // Add another delay before the insights request
        await delay(1000);
        
        // Now fetch the insights data - with retry
        const insightsData = await fetchWithRetry(
          `https://graph.facebook.com/v18.0/${account.id}/insights?fields=account_id,account_name,campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,impressions,clicks,spend,actions,action_values,reach,inline_link_clicks&time_range={"since":"${startDateStr}","until":"${endDateStr}"}&level=ad&time_increment=1&access_token=${connection.access_token}`
        );
        
        if (insightsData.error) {
          console.error(`[Meta] Error fetching insights for account ${account.id}:`, insightsData.error)
          continue
        }
        
        if (insightsData.data && insightsData.data.length > 0) {
          allInsights.push(...insightsData.data)
          // Log the first item to check for daily data structure
          if (insightsData.data[0]) {
            console.log(`[Meta] Sample data format (first item):`, {
              date_start: insightsData.data[0].date_start,
              date_stop: insightsData.data[0].date_stop,
              ad_id: insightsData.data[0].ad_id,
              impressions: insightsData.data[0].impressions
            })
          }
        }
      } catch (error) {
        console.error(`[Meta] Error fetching insights for account ${account.id}:`, error)
      }
    }

    console.log(`[Meta] Fetched a total of ${allInsights.length} insights across all accounts`)
    
    // Log count of distinct dates
    const uniqueDates = new Set(allInsights.filter((insight: any) => insight.date_start).map((insight: any) => insight.date_start))
    console.log(`[Meta] Data contains ${uniqueDates.size} unique dates (expected: ~${Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24) + 1)} days)`)
    
    if (allInsights.length === 0) {
      return { 
        success: true, 
        message: 'No insights data available for the specified period',
        insights: []
      }
    }

    // Only store data if not in dry run mode
    if (!dryRun) {
      // Process and store insights data in meta_ad_insights
      // First clear existing data for this date range to avoid duplicates
      const { error: deleteError } = await supabase
        .from('meta_ad_insights')
        .delete()
        .eq('brand_id', brandId)
        .gte('date', startDateStr)
        .lte('date', endDateStr)
      
      if (deleteError) {
        console.error(`[Meta] Error clearing existing insights:`, deleteError)
      }
  
      // Prepare and store the enriched insights
      const enrichedInsights = allInsights.map((insight: any) => {
        // Ensure we have a valid date
        let recordDate = insight.date_start || startDateStr;
        
        // Validate date format (YYYY-MM-DD)
        if (!recordDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
          console.warn(`[Meta] Invalid date format in insight record: "${recordDate}", defaulting to startDate`)
          recordDate = startDateStr;
        }
        
        // Get budget for this campaign if available
        const budget = campaignBudgets.has(insight.campaign_id) ? campaignBudgets.get(insight.campaign_id) : 0;
        
        return {
          brand_id: brandId,
          connection_id: connection.id,
          account_id: insight.account_id,
          account_name: insight.account_name,
          campaign_id: insight.campaign_id,
          campaign_name: insight.campaign_name,
          adset_id: insight.adset_id,
          adset_name: insight.adset_name,
          ad_id: insight.ad_id,
          ad_name: insight.ad_name,
          impressions: parseInt(insight.impressions || '0'),
          clicks: parseInt(insight.clicks || '0'),
          spend: parseFloat(insight.spend || '0'),
          reach: parseInt(insight.reach || '0'),
          link_clicks: parseInt(insight.inline_link_clicks || '0'),
          budget: budget,
          date: recordDate,
          actions: insight.actions || [],
          action_values: insight.action_values || []
        };
      })
      
      const { error: insertError } = await supabase
        .from('meta_ad_insights')
        .upsert(enrichedInsights)
      
      if (insertError) {
        console.error(`[Meta] Error storing insights:`, insertError)
        return { 
          success: false, 
          error: 'Failed to store Meta insights',
          details: insertError
        }
      }
    }
    
    return { 
      success: true, 
      message: dryRun ? 'Meta insights fetched successfully (dry run)' : 'Meta insights synced successfully',
      count: allInsights.length,
      insights: dryRun ? allInsights : undefined
    }
    
  } catch (error) {
    console.error(`[Meta] Error in fetchMetaAdInsights:`, error)
    return { 
      success: false, 
      error: 'Failed to fetch Meta ad insights',
      details: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Fetch Meta Ads metrics from the API
 */
export async function fetchMetaMetrics(brandId: string) {
  // Default metrics object with all properties initialized
  const defaultMetrics = {
    adSpend: 0,
    adSpendGrowth: 0,
    impressions: 0,
    impressionGrowth: 0,
    clicks: 0,
    clickGrowth: 0,
    conversions: 0,
    conversionGrowth: 0,
    ctr: 0,
    ctrGrowth: 0,
    cpc: 0,
    cpcLink: 0,
    costPerResult: 0,
    cprGrowth: 0,
    roas: 0,
    roasGrowth: 0,
    frequency: 0,
    budget: 0,
    reach: 0,
    dailyData: []
  };

  try {
    // Return default metrics if no brandId is provided
    if (!brandId) {
      console.error('fetchMetaMetrics called without brandId');
      return defaultMetrics;
    }
    
    const response = await fetch(`/api/metrics/meta?brandId=${brandId}`);
    
    if (!response.ok) {
      console.error(`Failed to fetch Meta metrics: ${response.status}`);
      return defaultMetrics;
    }
    
    const data = await response.json();
    
    // Create a complete object with strict type checking for each property
    return {
      adSpend: typeof data.adSpend === 'number' && !isNaN(data.adSpend) ? data.adSpend : 0,
      adSpendGrowth: typeof data.adSpendGrowth === 'number' && !isNaN(data.adSpendGrowth) ? data.adSpendGrowth : 0,
      impressions: typeof data.impressions === 'number' && !isNaN(data.impressions) ? data.impressions : 0,
      impressionGrowth: typeof data.impressionGrowth === 'number' && !isNaN(data.impressionGrowth) ? data.impressionGrowth : 0,
      clicks: typeof data.clicks === 'number' && !isNaN(data.clicks) ? data.clicks : 0,
      clickGrowth: typeof data.clickGrowth === 'number' && !isNaN(data.clickGrowth) ? data.clickGrowth : 0,
      conversions: typeof data.conversions === 'number' && !isNaN(data.conversions) ? data.conversions : 0,
      conversionGrowth: typeof data.conversionGrowth === 'number' && !isNaN(data.conversionGrowth) ? data.conversionGrowth : 0,
      ctr: typeof data.ctr === 'number' && !isNaN(data.ctr) ? data.ctr : 0,
      ctrGrowth: typeof data.ctrGrowth === 'number' && !isNaN(data.ctrGrowth) ? data.ctrGrowth : 0,
      cpc: typeof data.cpc === 'number' && !isNaN(data.cpc) ? data.cpc : 0,
      cpcLink: typeof data.cpcLink === 'number' && !isNaN(data.cpcLink) ? data.cpcLink : 0,
      costPerResult: typeof data.costPerResult === 'number' && !isNaN(data.costPerResult) ? data.costPerResult : 0,
      cprGrowth: typeof data.cprGrowth === 'number' && !isNaN(data.cprGrowth) ? data.cprGrowth : 0,
      roas: typeof data.roas === 'number' && !isNaN(data.roas) ? data.roas : 0,
      roasGrowth: typeof data.roasGrowth === 'number' && !isNaN(data.roasGrowth) ? data.roasGrowth : 0,
      frequency: typeof data.frequency === 'number' && !isNaN(data.frequency) ? data.frequency : 0,
      budget: typeof data.budget === 'number' && !isNaN(data.budget) ? data.budget : 0,
      reach: typeof data.reach === 'number' && !isNaN(data.reach) ? data.reach : 0,
      dailyData: Array.isArray(data.dailyData) ? data.dailyData : []
    };
  } catch (error) {
    console.error('Error fetching Meta metrics:', error);
    // Return default object instead of throwing to prevent component errors
    return defaultMetrics;
  }
}

/**
 * Fetches and updates Meta campaign budgets directly from the API
 * This function ensures that budget values are always up-to-date by fetching directly from Meta
 * and updating the database with real-time values
 */
export async function fetchMetaCampaignBudgets(brandId: string, forceSave: boolean = true) {
  console.log(`[Meta] Fetching campaign budgets for brand ${brandId}`)
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    // Find the Meta connection for this brand
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')
      .eq('status', 'active')
      .single()

    if (connectionError || !connection) {
      console.error(`[Meta] Error finding Meta connection for brand ${brandId}:`, connectionError)
      return { 
        success: false, 
        error: 'No active Meta connection found',
        budgets: []
      }
    }

    // Fetch ad accounts
    const accountsResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/adaccounts?fields=name,account_id&access_token=${connection.access_token}`
    )
    
    const accountsData = await accountsResponse.json()
    
    if (accountsData.error) {
      console.error(`[Meta] Error fetching ad accounts:`, accountsData.error)
      return { 
        success: false, 
        error: 'Failed to fetch Meta ad accounts',
        details: accountsData.error,
        budgets: []
      }
    }

    if (!accountsData.data || accountsData.data.length === 0) {
      console.log(`[Meta] No ad accounts found for brand ${brandId}`)
      return { 
        success: false, 
        error: 'No Meta ad accounts found for this connection',
        budgets: []
      }
    }

    console.log(`[Meta] Found ${accountsData.data.length} ad accounts`)
    
    let campaignBudgets = [];
    
    // For each ad account, fetch campaign budgets
    for (const account of accountsData.data) {
      console.log(`[Meta] Fetching campaign budgets for account ${account.name} (${account.id})`)
      
      try {
        // Fetch campaign information with budget data
        const campaignsResponse = await fetch(
          `https://graph.facebook.com/v18.0/${account.id}/campaigns?fields=id,name,status,daily_budget,lifetime_budget,configured_status,effective_status,objective,special_ad_categories,created_time,updated_time&access_token=${connection.access_token}`
        )
        
        const campaignsData = await campaignsResponse.json()
        
        if (campaignsData.data && campaignsData.data.length > 0) {
          console.log(`[Meta] Found ${campaignsData.data.length} campaigns in account ${account.name}`)
          
          for (const campaign of campaignsData.data) {
            let budget = 0;
            let budgetType = 'unknown';
            let budgetSource = 'api';
            
            // Check for daily budget (convert from cents to dollars)
            if (campaign.daily_budget && parseInt(campaign.daily_budget) > 0) {
              budget = parseFloat(campaign.daily_budget) / 100;
              budgetType = 'daily';
            } 
            // Check for lifetime budget (convert from cents to dollars)
            else if (campaign.lifetime_budget && parseInt(campaign.lifetime_budget) > 0) {
              budget = parseFloat(campaign.lifetime_budget) / 100;
              budgetType = 'lifetime';
            }
            
            campaignBudgets.push({
              campaign_id: campaign.id,
              campaign_name: campaign.name,
              account_id: account.id,
              account_name: account.name,
              status: campaign.status || campaign.effective_status,
              objective: campaign.objective,
              budget: budget,
              budget_type: budgetType,
              budget_source: budgetSource,
              created_time: campaign.created_time,
              updated_time: campaign.updated_time
            });
          }
        }
      } catch (error) {
        console.error(`[Meta] Error fetching campaign budgets for account ${account.id}:`, error)
      }
    }

    console.log(`[Meta] Fetched budgets for ${campaignBudgets.length} campaigns across all accounts`)
    
    // Update campaign budgets in the database if forceSave is true
    if (forceSave && campaignBudgets.length > 0) {
      console.log(`[Meta] Updating campaign budgets in the database`)
      
      // Update each campaign budget using upsert to ensure we don't create duplicates
      for (const campaignBudget of campaignBudgets) {
        const { error } = await supabase
          .from('meta_campaigns')
          .upsert({
            brand_id: brandId,
            connection_id: connection.id,
            campaign_id: campaignBudget.campaign_id,
            campaign_name: campaignBudget.campaign_name,
            account_id: campaignBudget.account_id,
            account_name: campaignBudget.account_name,
            status: campaignBudget.status,
            objective: campaignBudget.objective,
            budget: campaignBudget.budget,
            budget_type: campaignBudget.budget_type,
            budget_source: campaignBudget.budget_source,
            last_refresh_date: new Date().toISOString(),
            last_budget_refresh: new Date().toISOString()
          }, {
            onConflict: 'brand_id,campaign_id',
            ignoreDuplicates: false
          })
        
        if (error) {
          console.error(`[Meta] Error updating budget for campaign ${campaignBudget.campaign_id}:`, error)
        }
      }
      
      console.log(`[Meta] Campaign budgets updated successfully`)
    }
    
    // Format budgets for API response
    const formattedBudgets = campaignBudgets.map(campaign => ({
      id: campaign.campaign_id,
      campaign_id: campaign.campaign_id,
      campaign_name: campaign.campaign_name,
      budget: campaign.budget,
      budget_type: campaign.budget_type,
      formatted_budget: campaign.budget_type === 'daily' 
        ? `$${campaign.budget.toFixed(2)}/day`
        : `$${campaign.budget.toFixed(2)}`,
      budget_source: campaign.budget_source,
      status: campaign.status,
      objective: campaign.objective
    }));
    
    return { 
      success: true, 
      message: forceSave 
        ? 'Campaign budgets updated successfully' 
        : 'Campaign budgets fetched successfully (not saved)',
      budgets: formattedBudgets
    }
  } catch (error) {
    console.error(`[Meta] Error in fetchMetaCampaignBudgets:`, error)
    return { 
      success: false, 
      error: 'Failed to fetch campaign budgets',
      details: error instanceof Error ? error.message : 'Unknown error',
      budgets: []
    }
  }
}

/**
 * Fetches ad sets for a specific campaign from Meta API
 * This function retrieves ad sets with their budgets and performance metrics
 */
export async function fetchMetaAdSets(brandId: string, campaignId: string, forceSave = true) {
  try {
    console.log(`[Meta Service] Fetching ad sets for campaign ${campaignId}...`);
    
    // Create Supabase client with service role token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Get the active Meta connection for this brand
    const { data: metaConnection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')
      .eq('status', 'active')
      .single();
    
    if (connectionError || !metaConnection) {
      console.error('[Meta Service] Failed to get Meta connection:', connectionError);
      return { success: false, error: 'No active Meta connection found for this brand' };
    }
    
    // Get campaign to find ad account
    const { data: campaign, error: campaignError } = await supabase
      .from('meta_campaigns')
      .select('account_id')
      .eq('campaign_id', campaignId)
      .single();
    
    if (campaignError || !campaign) {
      console.error('[Meta Service] Failed to find campaign:', campaignError);
      return { success: false, error: 'Campaign not found' };
    }
    
    // Fetch ad sets from Meta API
    const adAccountId = campaign.account_id;
    
    // Fetch all ad sets from this campaign
    const adSetsResponse = await fetch(
      `https://graph.facebook.com/v18.0/${campaignId}/adsets?fields=id,name,status,daily_budget,lifetime_budget,budget_remaining,start_time,end_time,optimization_goal,bid_strategy,bid_amount,targeting&access_token=${metaConnection.access_token}`
    );
    
    if (!adSetsResponse.ok) {
      console.error('[Meta Service] Failed to fetch ad sets:', await adSetsResponse.text());
      return { success: false, error: 'Failed to fetch ad sets from Meta API' };
    }
    
    const adSetsData = await adSetsResponse.json();
    console.log(`[Meta Service] Found ${adSetsData.data?.length || 0} ad sets for campaign ${campaignId}`);
    
    if (!adSetsData.data || adSetsData.data.length === 0) {
      return { success: true, adSets: [] };
    }
    
    // Build date ranges for insights (last 30 days)
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);
    
    const since = thirtyDaysAgo.toISOString().split('T')[0];
    const until = now.toISOString().split('T')[0];
    
    // Process each ad set with its insights
    const processedAdSets = [];
    
    for (const adSet of adSetsData.data) {
      try {
        // Determine budget type and amount
        let budget = 0;
        let budgetType = 'unknown';
        
        if (adSet.daily_budget) {
          budget = parseInt(adSet.daily_budget, 10) / 100; // Convert cents to dollars
          budgetType = 'daily';
        } else if (adSet.lifetime_budget) {
          budget = parseInt(adSet.lifetime_budget, 10) / 100; // Convert cents to dollars
          budgetType = 'lifetime';
        }
        
        // --- Fetch Total Reach for the period --- 
        let totalReachForPeriod = 0;
        try {
          const totalReachResponse = await fetch(
            `https://graph.facebook.com/v18.0/${adSet.id}/insights?fields=reach&time_range={"since":"${since}","until":"${until}"}&access_token=${metaConnection.access_token}`
          );
          if (totalReachResponse.ok) {
            const totalReachData = await totalReachResponse.json();
            if (totalReachData.data && totalReachData.data.length > 0 && totalReachData.data[0].reach) {
              totalReachForPeriod = parseInt(totalReachData.data[0].reach, 10);
              console.log(`[Meta Service] Fetched Total Reach for AdSet ${adSet.id}: ${totalReachForPeriod}`);
            } else {
               console.log(`[Meta Service] No total reach data found for AdSet ${adSet.id}`);
            }
          } else {
            console.warn(`[Meta Service] Failed to fetch total reach for AdSet ${adSet.id}:`, await totalReachResponse.text());
          }
        } catch (reachError) {
          console.error(`[Meta Service] Error fetching total reach for AdSet ${adSet.id}:`, reachError);
        }
        // --- End Fetch Total Reach ---
        
        // Fetch insights for this ad set
        const insightsResponse = await fetch(
          `https://graph.facebook.com/v18.0/${adSet.id}/insights?fields=spend,impressions,clicks,conversions,ctr,cpc,cost_per_conversion,reach&time_range={"since":"${since}","until":"${until}"}&time_increment=1&access_token=${metaConnection.access_token}`
        );
        
        let totalSpent = 0;
        let totalImpressions = 0;
        let totalClicks = 0;
        let totalConversions = 0;
        let dailyInsights = [];
        
        if (insightsResponse.ok) {
          const insightsData = await insightsResponse.json();
          
          if (insightsData.data && insightsData.data.length > 0) {
            // Process daily insights data
            dailyInsights = insightsData.data.map((day: any) => {
              const daySpent = parseFloat(day.spend || 0);
              const dayImpressions = parseInt(day.impressions || 0, 10);
              const dayClicks = parseInt(day.clicks || 0, 10);
              const dayConversions = day.conversions?.length ? parseInt(day.conversions[0].value || 0, 10) : 0;
              
              // Update totals
              totalSpent += daySpent;
              totalImpressions += dayImpressions;
              totalClicks += dayClicks;
              totalConversions += dayConversions;
              
              // Calculate metrics
              const dayCtr = dayImpressions > 0 ? dayClicks / dayImpressions : 0;
              const dayCpc = dayClicks > 0 ? daySpent / dayClicks : 0;
              const dayCostPerConversion = dayConversions > 0 ? daySpent / dayConversions : 0;
              
              // Return formatted insight data for this day
              return {
                date: day.date_start,
                spent: daySpent,
                impressions: dayImpressions,
                clicks: dayClicks,
                conversions: dayConversions,
                reach: totalReachForPeriod,
                ctr: dayCtr,
                cpc: dayCpc,
                cost_per_conversion: dayCostPerConversion
              };
            });
          }
        } else {
          console.warn(`[Meta Service] Failed to fetch insights for ad set ${adSet.id}:`, await insightsResponse.text());
        }
        
        // Calculate overall metrics
        const ctr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
        const cpc = totalClicks > 0 ? totalSpent / totalClicks : 0;
        const costPerConversion = totalConversions > 0 ? totalSpent / totalConversions : 0;
        
        // Create formatted ad set object
        const formattedAdSet = {
          adset_id: adSet.id,
          adset_name: adSet.name,
          campaign_id: campaignId,
          status: adSet.status,
          budget,
          budget_type: budgetType,
          optimization_goal: adSet.optimization_goal || null,
          bid_strategy: adSet.bid_strategy || null,
          bid_amount: adSet.bid_amount ? parseFloat(adSet.bid_amount) / 100 : 0,
          targeting: adSet.targeting || null,
          start_date: adSet.start_time || null,
          end_date: adSet.end_time || null,
          spent: totalSpent,
          impressions: totalImpressions,
          clicks: totalClicks,
          reach: totalReachForPeriod,
          ctr,
          cpc,
          conversions: totalConversions,
          cost_per_conversion: costPerConversion,
          daily_insights: dailyInsights
        };
        
        processedAdSets.push(formattedAdSet);
      } catch (error) {
        console.error(`[Meta Service] Error processing ad set ${adSet.id}:`, error);
      }
    }
    
    console.log(`[Meta Service] Processed ${processedAdSets.length} ad sets`);
    
    // Save to database if requested
    if (forceSave && processedAdSets.length > 0) {
      try {
        // First, verify the meta_adsets table exists
        const { data: tableExists } = await supabase.rpc('create_meta_adsets_table');
        
        // Save the ad sets
        for (const adSet of processedAdSets) {
          // Save the ad set main record
          const { error: upsertError } = await supabase
            .from('meta_adsets')
            .upsert({
              brand_id: brandId,
              adset_id: adSet.adset_id,
              adset_name: adSet.adset_name,
              campaign_id: adSet.campaign_id,
              status: adSet.status,
              budget: adSet.budget,
              budget_type: adSet.budget_type,
              optimization_goal: adSet.optimization_goal,
              bid_strategy: adSet.bid_strategy,
              bid_amount: adSet.bid_amount,
              targeting: adSet.targeting,
              start_date: adSet.start_date,
              end_date: adSet.end_date,
              spent: adSet.spent,
              impressions: adSet.impressions,
              clicks: adSet.clicks,
              reach: adSet.reach,
              ctr: adSet.ctr,
              cpc: adSet.cpc,
              conversions: adSet.conversions,
              cost_per_conversion: adSet.cost_per_conversion,
              last_refresh_date: new Date().toISOString()
            }, {
              onConflict: 'adset_id'
            });
            
          if (upsertError) {
            console.error(`[Meta Service] Error upserting ad set ${adSet.adset_id}:`, upsertError);
          } else {
            // Now save each daily insight
            if (adSet.daily_insights && adSet.daily_insights.length > 0) {
              for (const insight of adSet.daily_insights) {
                const { error: insightError } = await supabase
                  .from('meta_adset_daily_insights')
                  .upsert({
                    brand_id: brandId,
                    adset_id: adSet.adset_id,
                    date: insight.date,
                    spent: insight.spent,
                    impressions: insight.impressions,
                    clicks: insight.clicks,
                    conversions: insight.conversions,
                    reach: insight.reach || 0,
                    ctr: insight.ctr,
                    cpc: insight.cpc,
                    cost_per_conversion: insight.cost_per_conversion
                  }, {
                    onConflict: 'adset_id,date'
                  });
                  
                if (insightError) {
                  console.error(`[Meta Service] Error saving daily insight for ad set ${adSet.adset_id} on ${insight.date}:`, insightError);
                }
              }
            }
          }
        }
        
        // Update campaign's adset_budget_total
        const totalAdSetBudget = processedAdSets.reduce((sum, adSet) => sum + adSet.budget, 0);
        
        const { error: updateCampaignError } = await supabase
          .from('meta_campaigns')
          .update({
            adset_budget_total: totalAdSetBudget,
            updated_at: new Date().toISOString()
          })
          .eq('campaign_id', campaignId);
          
        if (updateCampaignError) {
          console.error(`[Meta Service] Error updating campaign ${campaignId} with adset budget total:`, updateCampaignError);
        }
        
        console.log(`[Meta Service] Successfully saved ${processedAdSets.length} ad sets and their daily insights to the database`);
      } catch (error) {
        console.error('[Meta Service] Error saving ad sets to database:', error);
      }
    }
    
    return { success: true, adSets: processedAdSets };
  } catch (error) {
    console.error('[Meta Service] Error fetching ad sets:', error);
    return { success: false, error: 'An unexpected error occurred while fetching ad sets' };
  }
}

/**
 * Fetches individual ads for a specific ad set from Meta API
 * This function retrieves ads with their creative details and performance metrics
 * @param dateRange Optional date range to filter insights data
 */
export async function fetchMetaAds(
  brandId: string, 
  adsetId: string, 
  forceSave = true,
  dateRange?: { from: string, to: string }
) {
  try {
    console.log(`[Meta Service] Fetching ads for ad set ${adsetId}...`);
    
    // Create Supabase client with service role token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Get the active Meta connection for this brand
    const { data: metaConnection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')
      .eq('status', 'active')
      .single();
    
    if (connectionError || !metaConnection) {
      console.error('[Meta Service] Failed to get Meta connection:', connectionError);
      return { success: false, error: 'No active Meta connection found for this brand' };
    }
    
    // Get ad set to find campaign_id
    const { data: adSet, error: adSetError } = await supabase
      .from('meta_adsets')
      .select('campaign_id')
      .eq('adset_id', adsetId)
      .single();
    
    if (adSetError || !adSet) {
      console.error('[Meta Service] Failed to find ad set:', adSetError);
      return { success: false, error: 'Ad set not found' };
    }
    
    // Fetch ads from Meta API
    const campaignId = adSet.campaign_id;
    
    // Fetch all ads from this ad set
    const adsResponse = await fetch(
      `https://graph.facebook.com/v18.0/${adsetId}/ads?fields=id,name,status,effective_status,creative{id,object_story_spec{page_id,link_data{message,link,image_hash,call_to_action{type,value},description,name}},thumbnail_url,image_url}&access_token=${metaConnection.access_token}`
    );
    
    if (!adsResponse.ok) {
      console.error('[Meta Service] Failed to fetch ads:', await adsResponse.text());
      return { success: false, error: 'Failed to fetch ads from Meta API' };
    }
    
    const adsData = await adsResponse.json();
    console.log(`[Meta Service] Found ${adsData.data?.length || 0} ads for ad set ${adsetId}`);
    
    if (!adsData.data || adsData.data.length === 0) {
      return { success: true, ads: [] };
    }
    
    // Build date ranges for insights
    let since: string;
    let until: string;
    
    if (dateRange?.from && dateRange?.to) {
      // Use provided date range
      since = dateRange.from;
      until = dateRange.to;
      console.log(`[Meta Service] Using provided date range: ${since} to ${until}`);
    } else {
      // Default to last 30 days
      const now = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);
      
      since = thirtyDaysAgo.toISOString().split('T')[0];
      until = now.toISOString().split('T')[0];
      console.log(`[Meta Service] Using default date range (30 days): ${since} to ${until}`);
    }
    
    // Process each ad with its insights
    const processedAds = [];
    
    for (const ad of adsData.data) {
      try {
        // Extract creative details
        let creativeId = null;
        let previewUrl = null;
        let thumbnailUrl = null;
        let imageUrl = null;
        let headline = null;
        let body = null;
        let ctaType = null;
        let linkUrl = null;
        
        if (ad.creative) {
          creativeId = ad.creative.id;
          
          if (ad.creative.thumbnail_url) {
            thumbnailUrl = ad.creative.thumbnail_url;
          }
          
          if (ad.creative.image_url) {
            imageUrl = ad.creative.image_url;
          }
          
          // Extract more details from object_story_spec if available
          if (ad.creative.object_story_spec && ad.creative.object_story_spec.link_data) {
            const linkData = ad.creative.object_story_spec.link_data;
            
            if (linkData.message) {
              body = linkData.message;
            }
            
            if (linkData.link) {
              linkUrl = linkData.link;
            }
            
            if (linkData.name) {
              headline = linkData.name;
            }
            
            if (linkData.call_to_action && linkData.call_to_action.type) {
              ctaType = linkData.call_to_action.type;
            }
          }
        }
        
        // Fetch a preview URL if possible
        try {
          const previewResponse = await fetch(
            `https://graph.facebook.com/v18.0/${ad.id}/previews?ad_format=DESKTOP_FEED_STANDARD&access_token=${metaConnection.access_token}`
          );
          
          if (previewResponse.ok) {
            const previewData = await previewResponse.json();
            if (previewData.data && previewData.data.length > 0) {
              previewUrl = previewData.data[0].body;
            }
          }
        } catch (previewError) {
          console.warn(`[Meta Service] Could not fetch preview for ad ${ad.id}:`, previewError);
        }
        
        // Fetch insights for this ad
        const insightsResponse = await fetch(
          `https://graph.facebook.com/v18.0/${ad.id}/insights?fields=spend,impressions,clicks,conversions,ctr,cpc,cost_per_conversion,reach&time_range={"since":"${since}","until":"${until}"}&time_increment=1&access_token=${metaConnection.access_token}`
        );
        
        let totalSpent = 0;
        let totalImpressions = 0;
        let totalClicks = 0;
        let totalConversions = 0;
        let totalReach = 0;
        let dailyInsights = [];
        
        if (insightsResponse.ok) {
          const insightsData = await insightsResponse.json();
          
          if (insightsData.data && insightsData.data.length > 0) {
            // Process daily insights data
            dailyInsights = insightsData.data.map((day: any) => {
              const daySpent = parseFloat(day.spend || 0);
              const dayImpressions = parseInt(day.impressions || 0, 10);
              const dayClicks = parseInt(day.clicks || 0, 10);
              const dayConversions = day.conversions?.length ? parseInt(day.conversions[0].value || 0, 10) : 0;
              const dayReach = parseInt(day.reach || 0, 10);
              
              // Update totals
              totalSpent += daySpent;
              totalImpressions += dayImpressions;
              totalClicks += dayClicks;
              totalConversions += dayConversions;
              totalReach += dayReach;
              
              // Calculate metrics
              const dayCtr = dayImpressions > 0 ? dayClicks / dayImpressions : 0;
              const dayCpc = dayClicks > 0 ? daySpent / dayClicks : 0;
              const dayCostPerConversion = dayConversions > 0 ? daySpent / dayConversions : 0;
              
              // Return formatted insight data for this day
              return {
                date: day.date_start,
                spent: daySpent,
                impressions: dayImpressions,
                clicks: dayClicks,
                conversions: dayConversions,
                reach: dayReach,
                ctr: dayCtr,
                cpc: dayCpc,
                cost_per_conversion: dayCostPerConversion
              };
            });
          }
        } else {
          console.warn(`[Meta Service] Failed to fetch insights for ad ${ad.id}:`, await insightsResponse.text());
        }
        
        // Calculate overall metrics
        const ctr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
        const cpc = totalClicks > 0 ? totalSpent / totalClicks : 0;
        const costPerConversion = totalConversions > 0 ? totalSpent / totalConversions : 0;
        
        // Create formatted ad object
        const formattedAd = {
          ad_id: ad.id,
          ad_name: ad.name,
          adset_id: adsetId,
          campaign_id: campaignId,
          status: ad.status,
          effective_status: ad.effective_status,
          creative_id: creativeId,
          preview_url: previewUrl,
          thumbnail_url: thumbnailUrl,
          image_url: imageUrl,
          headline: headline,
          body: body,
          cta_type: ctaType,
          link_url: linkUrl,
          spent: totalSpent,
          impressions: totalImpressions,
          clicks: totalClicks,
          reach: totalReach,
          ctr,
          cpc,
          conversions: totalConversions,
          cost_per_conversion: costPerConversion,
          daily_insights: dailyInsights
        };
        
        processedAds.push(formattedAd);
      } catch (error) {
        console.error(`[Meta Service] Error processing ad ${ad.id}:`, error);
      }
    }
    
    console.log(`[Meta Service] Processed ${processedAds.length} ads`);
    
    // Save to database if requested
    if (forceSave && processedAds.length > 0) {
      try {
        // First, verify the meta_ads table exists
        const { data: tableExists } = await supabase.rpc('create_meta_ads_table');
        
        // Save the ads
        for (const ad of processedAds) {
          // Save the ad main record
          const { error: upsertError } = await supabase
            .from('meta_ads')
            .upsert({
              brand_id: brandId,
              ad_id: ad.ad_id,
              ad_name: ad.ad_name,
              adset_id: ad.adset_id,
              campaign_id: ad.campaign_id,
              status: ad.status,
              effective_status: ad.effective_status,
              creative_id: ad.creative_id,
              preview_url: ad.preview_url,
              thumbnail_url: ad.thumbnail_url,
              image_url: ad.image_url,
              headline: ad.headline,
              body: ad.body,
              cta_type: ad.cta_type,
              link_url: ad.link_url,
              spent: ad.spent,
              impressions: ad.impressions,
              clicks: ad.clicks,
              reach: ad.reach,
              ctr: ad.ctr,
              cpc: ad.cpc,
              conversions: ad.conversions,
              cost_per_conversion: ad.cost_per_conversion,
              last_refresh_date: new Date().toISOString()
            }, {
              onConflict: 'ad_id'
            });
            
          if (upsertError) {
            console.error(`[Meta Service] Error upserting ad ${ad.ad_id}:`, upsertError);
          } else {
            // Now save each daily insight
            if (ad.daily_insights && ad.daily_insights.length > 0) {
              for (const insight of ad.daily_insights) {
                const { error: insightError } = await supabase
                  .from('meta_ad_daily_insights')
                  .upsert({
                    brand_id: brandId,
                    ad_id: ad.ad_id,
                    adset_id: ad.adset_id,
                    date: insight.date,
                    spent: insight.spent,
                    impressions: insight.impressions,
                    clicks: insight.clicks,
                    conversions: insight.conversions,
                    reach: insight.reach || 0,
                    ctr: insight.ctr,
                    cpc: insight.cpc,
                    cost_per_conversion: insight.cost_per_conversion
                  }, {
                    onConflict: 'ad_id,date'
                  });
                  
                if (insightError) {
                  console.error(`[Meta Service] Error saving daily insight for ad ${ad.ad_id} on ${insight.date}:`, insightError);
                }
              }
            }
          }
        }
        
        console.log(`[Meta Service] Successfully saved ${processedAds.length} ads and their daily insights to the database`);
      } catch (error) {
        console.error('[Meta Service] Error saving ads to database:', error);
      }
    }
    
    return { success: true, ads: processedAds };
  } catch (error) {
    console.error('[Meta Service] Error fetching ads:', error);
    return { success: false, error: 'An unexpected error occurred while fetching ads' };
  }
} 