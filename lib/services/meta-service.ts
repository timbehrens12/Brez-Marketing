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
    
    // For each ad account, fetch insights
    for (const account of accountsData.data) {
      console.log(`[Meta] Fetching insights for account ${account.name} (${account.id})`)
      
      try {
        // First fetch campaign information to get budgets
        const campaignsResponse = await fetch(
          `https://graph.facebook.com/v18.0/${account.id}/campaigns?fields=id,name,daily_budget,lifetime_budget,effective_status&access_token=${connection.access_token}`
        )
        
        const campaignsData = await campaignsResponse.json()
        
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
        
        // Now fetch the insights data
        const insightsResponse = await fetch(
          `https://graph.facebook.com/v18.0/${account.id}/insights?fields=account_id,account_name,campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,impressions,clicks,spend,actions,action_values,reach,inline_link_clicks&time_range={"since":"${startDateStr}","until":"${endDateStr}"}&level=ad&time_increment=1&access_token=${connection.access_token}`
        )
        
        const insightsData = await insightsResponse.json()
        
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