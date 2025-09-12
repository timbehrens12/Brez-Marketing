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

// Global flag to track new day detection events
let isNewDayTransition = false;
let newDayTransitionInfo: any = null;

// Listen for new day detection events from the dashboard
if (typeof window !== 'undefined') {
  window.addEventListener('newDayDetected', (event: any) => {
    console.log('[Meta Service] 🌅 New day detected event received:', event.detail);
    isNewDayTransition = true;
    newDayTransitionInfo = event.detail;
    
    // Clear the flag after 5 minutes to prevent it from affecting future syncs
    setTimeout(() => {
      isNewDayTransition = false;
      newDayTransitionInfo = null;
      console.log('[Meta Service] 🕒 New day transition flag cleared');
    }, 5 * 60 * 1000);
  });
}

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
  dryRun: boolean = false,
  skipDemographics: boolean = false
) {
  console.log(`[Meta] Initiating sync for brand ${brandId} from ${startDate.toISOString()} to ${endDate.toISOString()}${dryRun ? ' (dry run)' : ''}${skipDemographics ? ' (skipping demographics)' : ''}`)

  // If this is a new day transition, handle it specially
  if (isNewDayTransition && newDayTransitionInfo) {
    console.log(`[Meta] 🌅 NEW DAY TRANSITION MODE ACTIVE for brand ${brandId}`);
    console.log(`[Meta] Previous date: ${newDayTransitionInfo.previousDate}, Current date: ${newDayTransitionInfo.currentDate}`);

    // Extend the date range to include both the previous day and current day
    // This ensures we properly sync and separate data for both days
    const previousDate = new Date(newDayTransitionInfo.previousDate);
    const currentDate = new Date(newDayTransitionInfo.currentDate);

    // Override the date range to fetch both days
    startDate = new Date(Math.min(startDate.getTime(), previousDate.getTime()));
    endDate = new Date(Math.max(endDate.getTime(), currentDate.getTime()));

    console.log(`[Meta] 📅 Extended sync range to cover transition: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
  }

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
    const todayStr = new Date().toISOString().split('T')[0];
    const isFetchingToday = startDateStr === todayStr && endDateStr === todayStr;

    let allInsights = []
    let campaignBudgets = new Map()
    
    // Collect all demographic and device data from all accounts
    let allDemographicData = { age: [], gender: [], ageGender: [] };
    let allDeviceData = { device: [], placement: [], platform: [] };
    
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
        
        // Construct insights URL - RESTORED 'reach' (limiting to 12 months instead of years)
        let insightsUrl = `https://graph.facebook.com/v18.0/${account.id}/insights?fields=account_id,account_name,campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,impressions,clicks,spend,actions,action_values,reach,inline_link_clicks,frequency,cpm,cpc,cpp,ctr,cost_per_action_type,cost_per_conversion,cost_per_unique_click,conversions,conversion_values,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p100_watched_actions,quality_ranking,engagement_rate_ranking,conversion_rate_ranking,objective&level=ad&access_token=${connection.access_token}`;

        if (isFetchingToday) {
          insightsUrl += `&date_preset=today`;
          console.log(`[Meta] Using date_preset=today for account ${account.id}`);
        } else {
          insightsUrl += `&time_range={"since":"${startDateStr}","until":"${endDateStr}"}&time_increment=1`;
        }
        
        const insightsData = await fetchWithRetry(insightsUrl);
        
        console.log(`[Meta] 🔍 DEBUG: API Response for account ${account.id}:`)
        console.log(`[Meta] 🔍 Request URL: ${insightsUrl.substring(0, 150)}...`)
        console.log(`[Meta] 🔍 Response data count: ${insightsData?.data?.length || 0}`)
        if (insightsData?.data?.length > 0) {
          console.log(`[Meta] 🔍 Date range in response: ${insightsData.data[0]?.date_start} to ${insightsData.data[insightsData.data.length - 1]?.date_stop}`)
          console.log(`[Meta] 🔍 Sample record:`, JSON.stringify(insightsData.data[0], null, 2))
        }
        
        if (insightsData.error) {
          console.error(`[Meta] Error fetching insights for account ${account.id}:`, insightsData.error)
          continue
        }

        // Fetch demographic breakdowns (age, gender) in parallel - SKIP if requested
        let demographicData = { age: [], gender: [], ageGender: [] };
        let deviceData = { device: [], placement: [], platform: [] };

        if (!skipDemographics) {
          try {
          console.log(`[Meta] Fetching demographic and device breakdowns for account ${account.id}`);
          
          // RESTORED: Add 'reach' back to breakdown queries - limit to 12 months instead of going back years
          // Age breakdown - WITH reach (limited to 12 months)
          let ageUrl = `https://graph.facebook.com/v18.0/${account.id}/insights?fields=impressions,clicks,spend,reach,cpm,cpc,ctr,date_start,date_stop&breakdowns=age&level=account&time_increment=1&access_token=${connection.access_token}`;
          
          // Gender breakdown - WITH reach (limited to 12 months)
          let genderUrl = `https://graph.facebook.com/v18.0/${account.id}/insights?fields=impressions,clicks,spend,reach,cpm,cpc,ctr,date_start,date_stop&breakdowns=gender&level=account&time_increment=1&access_token=${connection.access_token}`;
          
          // Age + Gender combined breakdown - WITH reach (limited to 12 months)
          let ageGenderUrl = `https://graph.facebook.com/v18.0/${account.id}/insights?fields=impressions,clicks,spend,reach,cpm,cpc,ctr,date_start,date_stop&breakdowns=age,gender&level=account&time_increment=1&access_token=${connection.access_token}`;
          
          // Device breakdown - WITH reach (limited to 12 months)
          let deviceUrl = `https://graph.facebook.com/v18.0/${account.id}/insights?fields=impressions,clicks,spend,reach,cpm,cpc,ctr,date_start,date_stop&breakdowns=impression_device&level=account&time_increment=1&access_token=${connection.access_token}`;
          
          // Publisher platform breakdown - WITH reach (limited to 12 months)
          let placementUrl = `https://graph.facebook.com/v18.0/${account.id}/insights?fields=impressions,clicks,spend,reach,cpm,cpc,ctr,date_start,date_stop&breakdowns=publisher_platform&level=account&time_increment=1&access_token=${connection.access_token}`;
          
          // Platform breakdown - WITH reach (limited to 12 months)
          let platformUrl = `https://graph.facebook.com/v18.0/${account.id}/insights?fields=impressions,clicks,spend,reach,cpm,cpc,ctr,date_start,date_stop&breakdowns=publisher_platform&level=account&time_increment=1&access_token=${connection.access_token}`;

          // Add time range to all URLs
          const timeRange = `&time_range={"since":"${startDateStr}","until":"${endDateStr}"}`;
          ageUrl += timeRange;
          genderUrl += timeRange;
          ageGenderUrl += timeRange;
          deviceUrl += timeRange;
          placementUrl += timeRange;
          platformUrl += timeRange;

          console.log(`[Meta] 🔥 DEBUGGING - About to fetch demographic breakdowns with URLs:`);
          console.log(`[Meta] 🔥 Age URL: ${ageUrl}`);
          console.log(`[Meta] 🔥 Gender URL: ${genderUrl}`);
          console.log(`[Meta] 🔥 Device URL: ${deviceUrl}`);

          // Helper function to fetch all pages of data
          const fetchAllPages = async (initialUrl: string, dataType: string) => {
            let allData: any[] = [];
            let nextUrl = initialUrl;
            let pageCount = 0;
            
            while (nextUrl && pageCount < 10) { // Increased to 10 pages for full 30-day data coverage
              pageCount++;
              console.log(`[Meta] 🔥 Fetching ${dataType} page ${pageCount}: ${nextUrl.substring(0, 100)}...`);
              
              const response = await fetchWithRetry(nextUrl);
              // No delay - speed is critical to prevent timeout
              
              if (response.data && Array.isArray(response.data)) {
                allData = allData.concat(response.data);
                console.log(`[Meta] 🔥 ${dataType} page ${pageCount}: ${response.data.length} records (total: ${allData.length})`);
              }
              
              // Check for next page
              nextUrl = response.paging?.next || null;
              if (!nextUrl) {
                console.log(`[Meta] ✅ ${dataType} pagination complete: ${allData.length} total records`);
                break;
              }
            }
            
            if (pageCount >= 10 && nextUrl) {
              console.log(`[Meta] ⚠️ ${dataType} pagination stopped at page limit (10 pages, ${allData.length} records)`);
            }
            
            return { data: allData, error: null };
          };

          // Fetch ALL essential breakdowns: Age, Gender, Device, Platform, Age+Gender
          console.log(`[Meta] 🔥 Starting COMPLETE demographic data fetch (Age + Gender + Device + Platform + Age+Gender)...`);
          const ageData = await fetchAllPages(ageUrl, 'Age');
          const genderData = await fetchAllPages(genderUrl, 'Gender');
          const deviceBreakdownData = await fetchAllPages(deviceUrl, 'Device');
          const platformData = await fetchAllPages(platformUrl, 'Platform');
          const ageGenderData = await fetchAllPages(ageGenderUrl, 'Age+Gender');
          
          // Skip only placement (redundant with platform)
          const placementData = { data: [], error: null };

          console.log(`[Meta] 🔥 DEBUGGING - Raw API responses:`);
          console.log(`[Meta] 🔥 Age data count: ${ageData.data?.length || 0}`);
          console.log(`[Meta] 🔥 Age date ranges:`, ageData.data?.map(d => `${d.date_start} to ${d.date_stop}`));
          console.log(`[Meta] 🔥 Device data count: ${deviceBreakdownData.data?.length || 0}`);
          console.log(`[Meta] 🔥 Device date ranges:`, deviceBreakdownData.data?.map(d => `${d.date_start} to ${d.date_stop}`));

          // Process demographic data
          if (ageData.data && !ageData.error) {
            demographicData.age = ageData.data;
            console.log(`[Meta] ✅ Age data processed: ${ageData.data.length} records`);
          } else {
            console.log(`[Meta] ❌ Age data FAILED:`, ageData.error || 'No data');
          }
          
          if (genderData.data && !genderData.error) {
            demographicData.gender = genderData.data;
            console.log(`[Meta] ✅ Gender data processed: ${genderData.data.length} records`);
          } else {
            console.log(`[Meta] ❌ Gender data FAILED:`, genderData.error || 'No data');
          }
          
          if (ageGenderData.data && !ageGenderData.error) {
            demographicData.ageGender = ageGenderData.data;
            console.log(`[Meta] ✅ Age+Gender data processed: ${ageGenderData.data.length} records`);
          } else {
            console.log(`[Meta] ❌ Age+Gender data FAILED:`, ageGenderData.error || 'No data');
          }
          
          // Process device data
          if (deviceBreakdownData.data && !deviceBreakdownData.error) {
            deviceData.device = deviceBreakdownData.data;
            console.log(`[Meta] ✅ Device data processed: ${deviceBreakdownData.data.length} records`);
          } else {
            console.log(`[Meta] ❌ Device data FAILED:`, deviceBreakdownData.error || 'No data');
          }
          
          console.log(`[Meta] 🔥 RAW PLACEMENT API RESPONSE (using publisher_platform):`, JSON.stringify(placementData, null, 2));
          if (placementData.data && !placementData.error) {
            deviceData.placement = placementData.data;
            console.log(`[Meta] ✅ Placement data processed: ${placementData.data.length} records`);
            console.log(`[Meta] 🔥 PLACEMENT DATA SAMPLE:`, JSON.stringify(placementData.data.slice(0, 2), null, 2));
          } else {
            console.log(`[Meta] ❌ Placement data FAILED:`, placementData.error || 'No data');
            if (placementData.error) {
              console.log(`[Meta] 🔥 PLACEMENT ERROR CODE:`, placementData.error.code);
              console.log(`[Meta] 🔥 PLACEMENT ERROR MESSAGE:`, placementData.error.message);
              console.log(`[Meta] 🔥 PLACEMENT ERROR TYPE:`, placementData.error.type);
            }
          }
          
          if (platformData.data && !platformData.error) {
            deviceData.platform = platformData.data;
            console.log(`[Meta] ✅ Platform data processed: ${platformData.data.length} records`);
          } else {
            console.log(`[Meta] ❌ Platform data FAILED:`, platformData.error || 'No data');
          }

          console.log(`[Meta] 🔥 FINAL COUNT: ${demographicData.age.length} age, ${demographicData.gender.length} gender, ${deviceData.device.length} device breakdowns`);
          
          } catch (error) {
            console.error(`[Meta] Error fetching demographic/device breakdowns for account ${account.id}:`, error);
          }
        } else {
          console.log(`[Meta] Skipping demographic and device data fetch for account ${account.id} (skipDemographics=true)`);
        }

        // Add account info to demographic data and aggregate
        demographicData.age.forEach((item: any) => {
          allDemographicData.age.push({ ...item, account_id: account.id, account_name: account.name });
        });
        demographicData.gender.forEach((item: any) => {
          allDemographicData.gender.push({ ...item, account_id: account.id, account_name: account.name });
        });
        demographicData.ageGender.forEach((item: any) => {
          allDemographicData.ageGender.push({ ...item, account_id: account.id, account_name: account.name });
        });
        
        // Add account info to device data and aggregate
        deviceData.device.forEach((item: any) => {
          allDeviceData.device.push({ ...item, account_id: account.id, account_name: account.name });
        });
        deviceData.placement.forEach((item: any) => {
          allDeviceData.placement.push({ ...item, account_id: account.id, account_name: account.name });
        });
        deviceData.platform.forEach((item: any) => {
          allDeviceData.platform.push({ ...item, account_id: account.id, account_name: account.name });
        });
        
        if (insightsData.data && insightsData.data.length > 0) {
          // If fetching for today using date_preset=today, Meta might not include date_start/date_stop in each item.
          // We'll assign today's date to these records.
          if (isFetchingToday) {
            insightsData.data.forEach((insight: any) => {
              insight.date_start = todayStr;
              insight.date_stop = todayStr;
            });
          }
          allInsights.push(...insightsData.data)
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
    
    console.log(`[Meta] Collected ${allDemographicData.age.length} age breakdowns, ${allDemographicData.gender.length} gender breakdowns, ${allDeviceData.device.length} device breakdowns across all accounts`)
    
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
  
      // Prepare and deduplicate the enriched insights
      // Group by (brand_id, ad_id, date) and merge duplicates
      const insightGroups = new Map<string, any>()
      
      allInsights.forEach((insight: any) => {
        // Ensure we have a valid date
        let recordDate = insight.date_start || startDateStr;
        
        // Validate date format (YYYY-MM-DD)
        if (!recordDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
          console.warn(`[Meta] Invalid date format in insight record: "${recordDate}", defaulting to startDate`)
          recordDate = startDateStr;
        }
        
        const key = `${brandId}-${insight.ad_id}-${recordDate}`
        
        if (insightGroups.has(key)) {
          // Merge with existing record (sum numeric values)
          const existing = insightGroups.get(key)
          existing.impressions += parseInt(insight.impressions || '0')
          existing.clicks += parseInt(insight.clicks || '0')
          existing.spend += parseFloat(insight.spend || '0')
          existing.reach += parseInt(insight.reach || '0')
          existing.link_clicks += parseInt(insight.inline_link_clicks || '0')
          
          // Keep the most recent updated_at
          existing.updated_at = new Date().toISOString()
        } else {
          // Get budget for this campaign if available
          const budget = campaignBudgets.has(insight.campaign_id) ? campaignBudgets.get(insight.campaign_id) : 0;
          
          // Create new record
          insightGroups.set(key, {
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
            action_values: insight.action_values || [],
            frequency: parseFloat(insight.frequency || '0'),
            cpm: parseFloat(insight.cpm || '0'),
            cpc: parseFloat(insight.cpc || '0'),
            cpp: parseFloat(insight.cpp || '0'),
            ctr: parseFloat(insight.ctr || '0'),
            cost_per_action_type: insight.cost_per_action_type || [],
            cost_per_conversion: insight.cost_per_conversion || [],
            cost_per_unique_click: parseFloat(insight.cost_per_unique_click || '0'),
            video_p25_watched_actions: insight.video_p25_watched_actions || [],
            video_p50_watched_actions: insight.video_p50_watched_actions || [],
            video_p75_watched_actions: insight.video_p75_watched_actions || [],
            video_p100_watched_actions: insight.video_p100_watched_actions || [],
            quality_ranking: insight.quality_ranking,
            engagement_rate_ranking: insight.engagement_rate_ranking,
            conversion_rate_ranking: insight.conversion_rate_ranking,
            objective: insight.objective,
            updated_at: new Date().toISOString()
          })
        }
      })
      
      // Convert map to array
      const enrichedInsights = Array.from(insightGroups.values())
      
      console.log(`[Meta] Deduplicated ${allInsights.length} raw insights into ${enrichedInsights.length} unique records`)
      
      // Use the deduplicated insights for storage

      // OPTIMIZED: Use bulk upsert for better performance and to avoid timeouts
      let insertError = null

      if (enrichedInsights.length > 0) {
        console.log(`[Meta] Bulk upserting ${enrichedInsights.length} records`)
        console.log(`[Meta] Sample record:`, JSON.stringify(enrichedInsights[0], null, 2))

        try {
          // Add timeout wrapper to catch database timeouts
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Database operation timeout')), 25000) // 25 second timeout
          })

          const upsertPromise = supabase
            .from('meta_ad_insights')
            .upsert(enrichedInsights, {
              onConflict: 'brand_id,ad_id,date',
              ignoreDuplicates: false
            })

          // Race between the actual operation and timeout
          const { error: bulkError } = await Promise.race([upsertPromise, timeoutPromise]) as any

          if (bulkError) {
            console.error(`[Meta] Bulk upsert failed:`, JSON.stringify(bulkError, null, 2))
            insertError = bulkError
          } else {
            console.log(`[Meta] ✅ Successfully bulk upserted ${enrichedInsights.length} records`)
          }
        } catch (bulkError) {
          console.error(`[Meta] Bulk upsert exception:`, bulkError instanceof Error ? bulkError.message : JSON.stringify(bulkError, null, 2))
          insertError = bulkError instanceof Error ? bulkError : new Error(String(bulkError))
        }
      }
      
      if (insertError) {
        console.error(`[Meta] Error storing insights:`, insertError)

        // Fallback: Try to store just a single record to isolate the issue
        if (enrichedInsights.length > 0) {
          console.log(`[Meta] Attempting fallback: storing single record...`)
          try {
            const singleRecord = enrichedInsights[0]
            console.log(`[Meta] Single record sample:`, JSON.stringify(singleRecord, null, 2))

            const { error: singleError } = await supabase
              .from('meta_ad_insights')
              .upsert([singleRecord], {
                onConflict: 'brand_id,ad_id,date',
                ignoreDuplicates: false
              })

            if (singleError) {
              console.error(`[Meta] Single record insert also failed:`, singleError)

              // Handle duplicate key error specifically for single records
              if (singleError.code === '21000' || (singleError.message && singleError.message.includes('cannot affect row a second time'))) {
                console.log(`[Meta] Single record duplicate error - this record already exists`)
                return {
                  success: true,
                  message: 'Meta insights already up to date (no new data to sync)',
                  count: 0,
                  insights: dryRun ? allInsights : undefined
                }
              }
            } else {
              console.log(`[Meta] ✅ Single record fallback succeeded`)
              return {
                success: true,
                message: 'Meta insights synced successfully (single record fallback)',
                count: 1,
                insights: dryRun ? allInsights : undefined
              }
            }
          } catch (fallbackError) {
            console.error(`[Meta] Fallback also failed:`, fallbackError)

            // If it's a duplicate error, consider it successful
            if (fallbackError && typeof fallbackError === 'object' && 'code' in fallbackError &&
                (fallbackError.code === '21000' || (fallbackError.message && fallbackError.message.includes('cannot affect row a second time')))) {
              console.log(`[Meta] Data already exists - considering successful`)
              return {
                success: true,
                message: 'Meta insights already up to date',
                count: 0,
                insights: dryRun ? allInsights : undefined
              }
            }
          }
        }

        return {
          success: false,
          error: 'Failed to store Meta insights',
          details: insertError
        }
      }

      // Store demographic data
      console.log(`[Meta] 🔥 DEBUGGING - About to store demographic data:`, {
        ageCount: allDemographicData.age.length,
        genderCount: allDemographicData.gender.length,
        ageGenderCount: allDemographicData.ageGender.length,
        brandId,
        startDateStr,
        endDateStr
      });
      
      if (allDemographicData.age.length > 0 || allDemographicData.gender.length > 0 || allDemographicData.ageGender.length > 0) {
        console.log(`[Meta] 🔥 Storing demographic data...`);
        
        // Clear existing demographic data for this date range
        console.log(`[Meta] 🔥 Clearing existing demographic data for date range ${startDateStr} to ${endDateStr}`);
        const deleteResult = await supabase
          .from('meta_demographics')
          .delete()
          .eq('brand_id', brandId)
          .gte('date_range_start', startDateStr)
          .lte('date_range_end', endDateStr);
        
        console.log(`[Meta] 🔥 Delete result:`, deleteResult);

        // Prepare demographic data for storage
        const demographicRecords = [];
        
        // Age breakdown records
        allDemographicData.age.forEach((item: any) => {
          demographicRecords.push({
            brand_id: brandId,
            connection_id: connection.id,
            account_id: item.account_id,
            account_name: item.account_name,
            breakdown_type: 'age',
            breakdown_value: item.age,
            impressions: parseInt(item.impressions || '0'),
            clicks: parseInt(item.clicks || '0'),
            spend: parseFloat(item.spend || '0'),
            reach: parseInt(item.reach || '0'),
            cpm: parseFloat(item.cpm || '0'),
            cpc: parseFloat(item.cpc || '0'),
            ctr: parseFloat(item.ctr || '0'),
            date_range_start: item.date_start || startDateStr,
            date_range_end: item.date_stop || endDateStr,
            updated_at: new Date().toISOString()
          });
        });

        // Gender breakdown records
        allDemographicData.gender.forEach((item: any) => {
          demographicRecords.push({
            brand_id: brandId,
            connection_id: connection.id,
            account_id: item.account_id,
            account_name: item.account_name,
            breakdown_type: 'gender',
            breakdown_value: item.gender,
            impressions: parseInt(item.impressions || '0'),
            clicks: parseInt(item.clicks || '0'),
            spend: parseFloat(item.spend || '0'),
            reach: parseInt(item.reach || '0'),
            cpm: parseFloat(item.cpm || '0'),
            cpc: parseFloat(item.cpc || '0'),
            ctr: parseFloat(item.ctr || '0'),
            date_range_start: item.date_start || startDateStr,
            date_range_end: item.date_stop || endDateStr,
            updated_at: new Date().toISOString()
          });
        });

        // Age + Gender breakdown records
        allDemographicData.ageGender.forEach((item: any) => {
          demographicRecords.push({
            brand_id: brandId,
            connection_id: connection.id,
            account_id: item.account_id,
            account_name: item.account_name,
            breakdown_type: 'age_gender',
            breakdown_value: `${item.age}_${item.gender}`,
            impressions: parseInt(item.impressions || '0'),
            clicks: parseInt(item.clicks || '0'),
            spend: parseFloat(item.spend || '0'),
            reach: parseInt(item.reach || '0'),
            cpm: parseFloat(item.cpm || '0'),
            cpc: parseFloat(item.cpc || '0'),
            ctr: parseFloat(item.ctr || '0'),
            date_range_start: item.date_start || startDateStr,
            date_range_end: item.date_stop || endDateStr,
            updated_at: new Date().toISOString()
          });
        });

        console.log(`[Meta] 🔥 About to store ${demographicRecords.length} demographic records`);
        console.log(`[Meta] 🔥 Sample demographic record:`, demographicRecords[0]);
        
        if (demographicRecords.length > 0) {
          const { error: demographicError, data: insertedData } = await supabase
            .from('meta_demographics')
            .upsert(demographicRecords);
          
          if (demographicError) {
            console.error(`[Meta] 🔥 ❌ Error storing demographic data:`, demographicError);
          } else {
            console.log(`[Meta] 🔥 ✅ Stored ${demographicRecords.length} demographic records successfully`);
            console.log(`[Meta] 🔥 ✅ Inserted data sample:`, insertedData?.[0]);
          }
        } else {
          console.log(`[Meta] 🔥 ❌ No demographic records to store!`);
        }
      }

      // Store device/placement data
      console.log(`[Meta] 🔥 DEBUGGING - About to store device data:`, {
        deviceCount: allDeviceData.device.length,
        placementCount: allDeviceData.placement.length,
        platformCount: allDeviceData.platform.length
      });
      
      if (allDeviceData.device.length > 0 || allDeviceData.placement.length > 0 || allDeviceData.platform.length > 0) {
        console.log(`[Meta] 🔥 Storing device/placement data...`);
        
        // Clear existing device data for this date range
        await supabase
          .from('meta_device_performance')
          .delete()
          .eq('brand_id', brandId)
          .gte('date_range_start', startDateStr)
          .lte('date_range_end', endDateStr);

        const deviceRecords = [];
        
        // Device breakdown records
        allDeviceData.device.forEach((item: any) => {
          deviceRecords.push({
            brand_id: brandId,
            connection_id: connection.id,
            account_id: item.account_id,
            account_name: item.account_name,
            breakdown_type: 'device',
            breakdown_value: item.impression_device,
            impressions: parseInt(item.impressions || '0'),
            clicks: parseInt(item.clicks || '0'),
            spend: parseFloat(item.spend || '0'),
            reach: parseInt(item.reach || '0'),
            cpm: parseFloat(item.cpm || '0'),
            cpc: parseFloat(item.cpc || '0'),
            ctr: parseFloat(item.ctr || '0'),
            date_range_start: item.date_start || startDateStr,
            date_range_end: item.date_stop || endDateStr,
            updated_at: new Date().toISOString()
          });
        });

        // Placement breakdown records
        allDeviceData.placement.forEach((item: any) => {
          deviceRecords.push({
            brand_id: brandId,
            connection_id: connection.id,
            account_id: item.account_id,
            account_name: item.account_name,
            breakdown_type: 'placement',
            breakdown_value: item.publisher_platform,
            impressions: parseInt(item.impressions || '0'),
            clicks: parseInt(item.clicks || '0'),
            spend: parseFloat(item.spend || '0'),
            reach: parseInt(item.reach || '0'),
            cpm: parseFloat(item.cpm || '0'),
            cpc: parseFloat(item.cpc || '0'),
            ctr: parseFloat(item.ctr || '0'),
            date_range_start: item.date_start || startDateStr,
            date_range_end: item.date_stop || endDateStr,
            updated_at: new Date().toISOString()
          });
        });

        // Platform breakdown records
        allDeviceData.platform.forEach((item: any) => {
          deviceRecords.push({
            brand_id: brandId,
            connection_id: connection.id,
            account_id: item.account_id,
            account_name: item.account_name,
            breakdown_type: 'platform',
            breakdown_value: item.publisher_platform,
            impressions: parseInt(item.impressions || '0'),
            clicks: parseInt(item.clicks || '0'),
            spend: parseFloat(item.spend || '0'),
            reach: parseInt(item.reach || '0'),
            cpm: parseFloat(item.cpm || '0'),
            cpc: parseFloat(item.cpc || '0'),
            ctr: parseFloat(item.ctr || '0'),
            date_range_start: item.date_start || startDateStr,
            date_range_end: item.date_stop || endDateStr,
            updated_at: new Date().toISOString()
          });
        });

        console.log(`[Meta] 🔥 About to store ${deviceRecords.length} device records`);
        console.log(`[Meta] 🔥 Sample device record:`, deviceRecords[0]);
        
        if (deviceRecords.length > 0) {
          const { error: deviceError, data: insertedDeviceData } = await supabase
            .from('meta_device_performance')
            .upsert(deviceRecords);
          
          if (deviceError) {
            console.error(`[Meta] 🔥 ❌ Error storing device/placement data:`, deviceError);
          } else {
            console.log(`[Meta] 🔥 ✅ Stored ${deviceRecords.length} device/placement records successfully`);
            console.log(`[Meta] 🔥 ✅ Inserted device data sample:`, insertedDeviceData?.[0]);
          }
        } else {
          console.log(`[Meta] 🔥 ❌ No device records to store!`);
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
          `https://graph.facebook.com/v18.0/${account.id}/campaigns?fields=id,name,status,daily_budget,lifetime_budget,configured_status,effective_status,objective,special_ad_categories,created_time,updated_time,bid_strategy,buying_type,spend_cap,start_time,stop_time,issues_info,pacing_type,adlabels&access_token=${connection.access_token}`
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
              updated_time: campaign.updated_time,
              bid_strategy: campaign.bid_strategy,
              buying_type: campaign.buying_type,
              spend_cap: campaign.spend_cap,
              start_time: campaign.start_time,
              stop_time: campaign.stop_time,
              issues_info: campaign.issues_info,
              pacing_type: campaign.pacing_type,
              adlabels: campaign.adlabels
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
            last_budget_refresh: new Date().toISOString(),
            bid_strategy: campaignBudget.bid_strategy,
            buying_type: campaignBudget.buying_type,
            spend_cap: campaignBudget.spend_cap,
            start_time: campaignBudget.start_time,
            stop_time: campaignBudget.stop_time,
            issues_info: campaignBudget.issues_info,
            pacing_type: campaignBudget.pacing_type,
            adlabels: campaignBudget.adlabels
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
      objective: campaign.objective,
      bid_strategy: campaign.bid_strategy,
      buying_type: campaign.buying_type,
      spend_cap: campaign.spend_cap,
      start_time: campaign.start_time,
      stop_time: campaign.stop_time,
      issues_info: campaign.issues_info,
      pacing_type: campaign.pacing_type,
      adlabels: campaign.adlabels
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

interface AdSetInsight { date: string; spent: number; impressions: number; clicks: number; conversions: number; reach: number; ctr: number; cpc: number; cost_per_conversion: number;}

interface ProcessedAdSet {
  adset_id: string;
  adset_name: string;
  campaign_id: string;
  status: string;
  budget: number;
  budget_type: string;
  optimization_goal: string | null;
  bid_strategy: string | null;
  bid_amount: number;
  targeting: any | null;
  start_date: string | null;
  end_date: string | null;
  adset_schedule: any | null;
  attribution_spec: any | null;
  creative_sequence: any | null;
  frequency_control_specs: any | null;
  destination_type: string | null;
  promoted_object: any | null;
  issues_info: any | null;
  spent: number;
  impressions: number;
  clicks: number;
  reach: number;
  ctr: number;
  cpc: number;
  conversions: number;
  cost_per_conversion: number;
  daily_insights: AdSetInsight[];
}

/**
 * Fetches ad sets for a specific campaign from Meta API
 * This function retrieves ad sets with their budgets and performance metrics
 */
export async function fetchMetaAdSets(
  brandId: string, 
  campaignId: string, 
  forceSave = true,
  startDate?: Date,
  endDate?: Date
) {
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
    
    // Get campaign to find ad account (get most recent if multiple exist)
    const { data: campaigns, error: campaignError } = await supabase
      .from('meta_campaigns')
      .select('account_id')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })
      .limit(1);
    
    const campaign = campaigns?.[0];
    
    if (campaignError || !campaign) {
      console.error('[Meta Service] Failed to find campaign:', campaignError);
      return { success: false, error: 'Campaign not found' };
    }
    
    // Fetch ad sets from Meta API
    const adAccountId = campaign.account_id;
    
    // Fetch all ad sets from this campaign
    const adSetsResponse = await fetchWithRetry(
      `https://graph.facebook.com/v18.0/${campaignId}/adsets?fields=id,name,status,daily_budget,lifetime_budget,budget_remaining,start_time,end_time,optimization_goal,bid_strategy,bid_amount,targeting,adset_schedule,attribution_spec,creative_sequence,frequency_control_specs,destination_type,promoted_object,issues_info&access_token=${metaConnection.access_token}`,
      {},
      3, // Max 3 retries
      5000 // Initial 5 second backoff
    );
    
    if (adSetsResponse.error) {
      const errorData = adSetsResponse.error;
      console.error('[Meta Service] Failed to fetch ad sets:', errorData);

      // Specific Meta API rate limit errors
      if (
        errorData.code === 4 || 
        errorData.code === 17 || 
        errorData.code === 32 ||
        (errorData.type === 'OAuthException' && errorData.code === 613) ||
        (errorData.type === 'OAuthException' && errorData.is_transient) ||
        errorData.message?.toLowerCase().includes('rate') ||
        errorData.error_subcode === 2446079 ||
        errorData.error_user_title === "Ad Account Has Too Many API Calls"
      ) {
        return { 
          success: false, 
          error: 'Meta API rate limit reached: ' + (errorData.message || 'Too many requests')
        };
      }
      
      return { success: false, error: 'Failed to fetch ad sets from Meta API', details: errorData };
    }
    
    const adSetsData = adSetsResponse; // Rename for clarity, it's already parsed data
    console.log(`[Meta Service] Found ${adSetsData.data?.length || 0} ad sets for campaign ${campaignId}`);
    
    if (!adSetsData.data || adSetsData.data.length === 0) {
      return { success: true, adSets: [] };
    }
    
    // Build date ranges for insights (last 30 days)
    let since: string;
    let until: string;
    
    if (startDate && endDate) {
      since = startDate.toISOString().split('T')[0];
      until = endDate.toISOString().split('T')[0];
      console.log(`[Meta Service] Using provided date range for Ad Set fetch: ${since} to ${until}`);
    } else {
      // Default to last 30 days if no dates provided
      const now = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);
      since = thirtyDaysAgo.toISOString().split('T')[0];
      until = now.toISOString().split('T')[0];
      console.log(`[Meta Service] No date range provided, defaulting to last 30 days: ${since} to ${until}`);
    }
    
    // Process each ad set with its insights
    const processedAdSets: ProcessedAdSet[] = []; // Add type annotation
    let rateLimited = false;
    
    // Process in batches to avoid rate limits - 2 ad sets at a time
    const batchSize = 2;
    for (let i = 0; i < adSetsData.data.length; i += batchSize) {
      if (rateLimited) break; // Stop processing if we hit rate limits
      
      const batch = adSetsData.data.slice(i, i + batchSize);
      console.log(`[Meta Service] Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(adSetsData.data.length/batchSize)} with ${batch.length} ad sets`);
      
      // Add a small delay between batches to avoid rate limiting
      if (i > 0) {
        await delay(2000); // 2 second delay between batches
      }
      
      // Process this batch in parallel
      const batchResults = await Promise.all(batch.map(async (adSet: any) => {
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
            // RESTORED reach query (using 12-month limitation)
            const totalReachResponse = await fetchWithRetry(
              `https://graph.facebook.com/v18.0/${adSet.id}/insights?fields=reach&time_range={"since":"${since}","until":"${until}"}&access_token=${metaConnection.access_token}`,
              {},
              2, // Max 2 retries
              2000 // Initial 2 second backoff
            );
            
            if (totalReachResponse.error) {
              const errorData = totalReachResponse.error;
              // Check if we hit rate limits
              if (errorData.message?.includes('rate') || errorData.message?.includes('too many')) {
                console.warn('[Meta Service] Rate limited during reach fetch, stopping batch processing');
                rateLimited = true;
                return null;
              }
              console.warn(`[Meta Service] Failed to fetch total reach for AdSet ${adSet.id}:`, errorData);
            } else if (totalReachResponse.data && totalReachResponse.data.length > 0 && totalReachResponse.data[0].reach) {
              totalReachForPeriod = parseInt(totalReachResponse.data[0].reach, 10);
              console.log(`[Meta Service] Fetched Total Reach for AdSet ${adSet.id}: ${totalReachForPeriod}`);
            } else {
               console.log(`[Meta Service] No total reach data found for AdSet ${adSet.id}`);
            }
          } catch (reachError) {
            console.error(`[Meta Service] Error fetching total reach for AdSet ${adSet.id}:`, reachError);
          }
          // --- End Fetch Total Reach ---
          
          // Add a small delay before the next API call to reduce rate limiting risk
          await delay(1000);
          
          // Fetch insights for this ad set
          let totalSpent = 0;
          let totalImpressions = 0;
          let totalClicks = 0;
          let totalConversions = 0;
          let dailyInsights = [];
          
          try {
            const insightsResponse = await fetchWithRetry(
              `https://graph.facebook.com/v18.0/${adSet.id}/insights?fields=spend,impressions,clicks,conversions,ctr,cpc,cost_per_conversion,reach&time_range={"since":"${since}","until":"${until}"}&time_increment=1&access_token=${metaConnection.access_token}`,
              {},
              2, // Max 2 retries
              2000 // Initial 2 second backoff
            );
            
            if (insightsResponse.error) {
              const errorData = insightsResponse.error;
              // Check if we hit rate limits
              if (errorData.message?.includes('rate') || errorData.message?.includes('too many')) {
                console.warn('[Meta Service] Rate limited during insights fetch, stopping batch processing');
                rateLimited = true;
                return null;
              }
              console.warn(`[Meta Service] Failed to fetch insights for ad set ${adSet.id}:`, errorData);
            } else if (insightsResponse.data && insightsResponse.data.length > 0) {
              // Process daily insights data
              dailyInsights = insightsResponse.data.map((day: any) => {
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
                  reach: parseInt(day.reach || 0, 10),
                  ctr: dayCtr,
                  cpc: dayCpc,
                  cost_per_conversion: dayCostPerConversion
                };
              });
            }
          } catch (insightsError) {
            console.error(`[Meta Service] Error fetching insights for ad set ${adSet.id}:`, insightsError);
          }
          
          // Calculate overall metrics
          const ctr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
          const cpc = totalClicks > 0 ? totalSpent / totalClicks : 0;
          const costPerConversion = totalConversions > 0 ? totalSpent / totalConversions : 0;
          
          // Create formatted ad set object
          return {
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
            adset_schedule: adSet.adset_schedule || null,
            attribution_spec: adSet.attribution_spec || null,
            creative_sequence: adSet.creative_sequence || null,
            frequency_control_specs: adSet.frequency_control_specs || null,
            destination_type: adSet.destination_type || null,
            promoted_object: adSet.promoted_object || null,
            issues_info: adSet.issues_info || null,
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
        } catch (error) {
          console.error(`[Meta Service] Error processing ad set ${adSet.id}:`, error);
          return null;
        }
      }));
      
      // Add successful results to the processed ad sets
      batchResults.forEach(result => {
        if (result) processedAdSets.push(result);
      });
    }
    
    if (rateLimited && processedAdSets.length === 0) {
      return { 
        success: false, 
        error: 'Meta API rate limit reached while processing ad sets',
        adSets: [] // Return empty array
      };
    }
    
    console.log(`[Meta Service] Successfully processed ${processedAdSets.length} ad sets`);
    
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
              adset_schedule: adSet.adset_schedule,
              attribution_spec: adSet.attribution_spec,
              creative_sequence: adSet.creative_sequence,
              frequency_control_specs: adSet.frequency_control_specs,
              destination_type: adSet.destination_type,
              promoted_object: adSet.promoted_object,
              issues_info: adSet.issues_info,
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
          }
          
          // Skip daily insights table operations if we're rate limited to save time
          if (rateLimited) continue;
          
          // Verify and save daily insights table
          if (adSet.daily_insights && adSet.daily_insights.length > 0) {
            // First verify table exists
            const { data: insightsTableExists } = await supabase.rpc('create_meta_adset_daily_insights_table');
            
            // Save each daily insight
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
                  reach: insight.reach,
                  ctr: insight.ctr,
                  cpc: insight.cpc,
                  cost_per_conversion: insight.cost_per_conversion
                }, {
                  onConflict: 'adset_id,date'
                });
              
              if (insightError) {
                console.error(`[Meta Service] Error upserting daily insight for ad set ${adSet.adset_id} on ${insight.date}:`, insightError);
              }
            }
          }
        }
        console.log(`[Meta Service] Saved ${processedAdSets.length} ad sets to database`);
      } catch (saveError) {
        console.error('[Meta Service] Error saving ad sets to database:', saveError);
      }
    }
    
    return { success: true, adSets: processedAdSets };
  } catch (error) {
    console.error('[Meta Service] Error in fetchMetaAdSets:', error);
    return { success: false, error: 'Error fetching ad sets: ' + (error as Error).message };
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
    
    // Get ad set to find campaign_id (get most recent if multiple exist)
    const { data: adSets, error: adSetError } = await supabase
      .from('meta_adsets')
      .select('campaign_id')
      .eq('adset_id', adsetId)
      .order('created_at', { ascending: false })
      .limit(1);
    
    const adSet = adSets?.[0];
    
    if (adSetError || !adSet) {
      console.error('[Meta Service] Failed to find ad set:', adSetError);
      return { success: false, error: 'Ad set not found' };
    }
    
    // Fetch ads from Meta API
    const campaignId = adSet.campaign_id;
    
    // Fetch all ads from this ad set
    const adsResponse = await fetch(
      `https://graph.facebook.com/v18.0/${adsetId}/ads?fields=id,name,status,effective_status,adlabels,tracking_specs,recommendations,creative{id,object_story_spec{page_id,link_data{message,link,image_hash,call_to_action{type,value},description,name},video_data,template_data},thumbnail_url,image_url,video_id,image_crops,status,url_tags}&access_token=${metaConnection.access_token}`
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
          adlabels: ad.adlabels,
          tracking_specs: ad.tracking_specs,
          recommendations: ad.recommendations,
          creative_id: creativeId,
          preview_url: previewUrl,
          thumbnail_url: thumbnailUrl,
          image_url: imageUrl,
          headline: headline,
          body: body,
          cta_type: ctaType,
          link_url: linkUrl,
          video_id: ad.creative?.video_id,
          image_crops: ad.creative?.image_crops,
          creative_status: ad.creative?.status,
          url_tags: ad.creative?.url_tags,
          video_data: ad.creative?.object_story_spec?.video_data,
          template_data: ad.creative?.object_story_spec?.template_data,
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
              adlabels: ad.adlabels,
              tracking_specs: ad.tracking_specs,
              recommendations: ad.recommendations,
              creative_id: ad.creative_id,
              preview_url: ad.preview_url,
              thumbnail_url: ad.thumbnail_url,
              image_url: ad.image_url,
              headline: ad.headline,
              body: ad.body,
              cta_type: ad.cta_type,
              link_url: ad.link_url,
              video_id: ad.video_id,
              image_crops: ad.image_crops,
              creative_status: ad.creative_status,
              url_tags: ad.url_tags,
              video_data: ad.video_data,
              template_data: ad.template_data,
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

// Add this interface for token expiration detection
export interface MetaApiError {
  error: {
    message: string;
    type: string;
    code: number;
    fbtrace_id?: string;
  };
}

// Add this utility function to detect token expiration
export function isTokenExpired(error: any): boolean {
  if (!error) return false;
  
  // Check for various token expiration patterns
  const errorMessage = error.message || error.error?.message || '';
  const errorCode = error.code || error.error?.code;
  
  return (
    errorCode === 190 || // OAuthException
    errorMessage.includes('token has expired') ||
    errorMessage.includes('token is invalid') ||
    errorMessage.includes('Error validating access token') ||
    errorMessage.includes('OAuthException') ||
    errorMessage.includes('Invalid OAuth access token')
  );
}

// Add this utility function to get user-friendly token error messages
export function getTokenErrorMessage(error: any): string {
  if (isTokenExpired(error)) {
    return 'Your Meta (Facebook/Instagram) connection has expired. Please reconnect your Meta account in Settings to continue viewing your advertising data.';
  }
  
  // Check for rate limiting
  if (error.message?.includes('rate limit') || error.code === 4 || error.code === 17 || error.code === 613) {
    return 'Meta API rate limit reached. Please wait a few minutes before refreshing.';
  }
  
  // Check for insufficient permissions
  if (error.code === 200 || error.message?.includes('Insufficient permission')) {
    return 'Insufficient permissions to access this Meta data. Please ensure your Meta account has the necessary permissions.';
  }
  
  return `Meta API error: ${error.message || 'Unknown error occurred'}`;
}

// Add this utility to standardize Meta API error responses
export function createMetaErrorResponse(error: any) {
  const isExpired = isTokenExpired(error);
  const message = getTokenErrorMessage(error);
  
  return {
    success: false,
    error: message,
    isTokenExpired: isExpired,
    errorCode: error.code || error.error?.code,
    needsReconnection: isExpired,
    details: error
  };
} 