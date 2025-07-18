import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchMetaAdInsights } from '@/lib/services/meta-service'

// Define interfaces for our data types
interface MetaDataItem {
  spend: string;
  impressions: string;
  clicks: string;
  conversions: string;
  reach: string;
  inline_link_clicks: string;
  date: string;
  [key: string]: any;
}

interface DailyDataItem {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  roas: number;
  reach: number;
  [key: string]: string | number;
}

interface ProcessedMetaData {
  adSpend: number;
  adSpendGrowth: number;
  impressions: number;
  impressionGrowth: number;
  clicks: number;
  clickGrowth: number;
  conversions: number;
  conversionGrowth: number;
  ctr: number;
  ctrGrowth: number;
  cpc: number;
  cpcLink: number;
  costPerResult: number;
  cprGrowth: number;
  roas: number;
  roasGrowth: number;
  frequency: number;
  budget: number;
  reach: number;
  dailyData: DailyDataItem[];
}

// Simple in-memory cache for the API to prevent duplicate calls
const apiCache = new Map<string, { timestamp: number; data: any; cacheDate: string }>();

// Cache TTL: 1 minute, but we'll also check if the cache crosses day boundaries
const CACHE_TTL = 60000; // 1 minute cache duration

// Helper function to get current date string for cache validation
function getCurrentDateString(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

// Helper function to check if cache is still valid for the current day
function isCacheValidForToday(cacheEntry: { timestamp: number; data: any; cacheDate: string }): boolean {
  const now = Date.now();
  const timeSinceCache = now - cacheEntry.timestamp;
  
  // If cache is older than TTL, it's invalid
  if (timeSinceCache >= CACHE_TTL) {
    return false;
  }
  
  // If cache was created on a different day, it's invalid
  const currentDate = getCurrentDateString();
  if (cacheEntry.cacheDate !== currentDate) {
    console.log(`[CACHE] Cache invalid due to date change: cached on ${cacheEntry.cacheDate}, now ${currentDate}`);
    return false;
  }
  
  return true;
}

// Helper function to clean up expired cache entries
function cleanupExpiredCache(): void {
  for (const [key, entry] of apiCache.entries()) {
    if (!isCacheValidForToday(entry)) {
      console.log(`[CACHE] Removing expired cache entry: ${key}`);
      apiCache.delete(key);
    }
  }
}

// Run cache cleanup every 30 seconds
setInterval(cleanupExpiredCache, 30000);

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const brandId = url.searchParams.get('brandId')
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    const bypassCache = url.searchParams.get('bypass_cache') === 'true'
    const forceLoad = url.searchParams.get('force_load') === 'true'
    const forceRefresh = url.searchParams.get('force_refresh') === 'true'
    const debug = url.searchParams.get('debug') === 'true'
    const dateDebug = url.searchParams.get('date_debug') === 'true'
    const strictDateRange = url.searchParams.get('strict_date_range') === 'true'
    const refresh = url.searchParams.get('refresh') === 'true' || forceRefresh === true
    const preset = url.searchParams.get('preset')
    
    // 🔥🔥🔥 MAJOR DEBUG: Log all incoming parameters
    console.log(`🔥🔥🔥 [META API] INCOMING REQUEST:`, {
      brandId,
      from,
      to,
      bypassCache,
      forceLoad,
      forceRefresh,
      refresh,
      debug,
      preset,
      allParams: Object.fromEntries(url.searchParams.entries())
    });
    
    // Check for yesterday preset explicitly
    let isYesterdayPreset = preset === 'yesterday';
    
    // Create a more intelligent cache key that includes the current date
    const currentDate = getCurrentDateString();
    const cacheKey = `meta-metrics-${brandId}-${from}-${to}${isYesterdayPreset ? '-yesterday' : ''}-${currentDate}`;
    
    // Add detailed logging to troubleshoot date filtering issues
    console.log(`Meta metrics request - brandId: ${brandId}, from: ${from}, to: ${to}, preset: ${preset}, bypassCache: ${bypassCache}, forceRefresh: ${forceRefresh}, strictDateRange: ${strictDateRange}`)
    
    // Validate brandId
    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    // Validate date range for strict mode
    if (strictDateRange && (!from || !to) && !isYesterdayPreset) {
      console.log(`Strict date range requested but missing from or to: from=${from}, to=${to}`)
      return NextResponse.json({ 
        error: 'Date range parameters required',
        _dateRange: { missing: true } 
      }, { status: 400 })
    }
    
    // Check if this exact request is in our cache and not expired (unless bypass requested)
    if (!bypassCache && !refresh) {
      const cachedResponse = apiCache.get(cacheKey);
      if (cachedResponse && isCacheValidForToday(cachedResponse)) {
        console.log(`🔥🔥🔥 [META API] RETURNING CACHED DATA for ${cacheKey} (cached on ${cachedResponse.cacheDate})`);
        return NextResponse.json(cachedResponse.data);
      } else if (cachedResponse) {
        // Cache expired or invalid, remove it
          apiCache.delete(cacheKey);
        console.log(`🔥🔥🔥 [META API] CACHE EXPIRED/INVALID for ${cacheKey}, will fetch fresh data`);
      }
    } else {
      console.log(`🔥🔥🔥 [META API] BYPASSING CACHE for ${cacheKey} because bypassCache=${bypassCache}, refresh=${refresh}`);
    }
    
    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // Get Meta connection
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')
      .eq('status', 'active')
      .single()

    if (connectionError) {
      console.log(`Error retrieving Meta connection: ${JSON.stringify(connectionError)}`)
      return NextResponse.json({ error: 'Error retrieving Meta connection', details: connectionError }, { status: 500 })
    }
    
    if (!connection) {
      console.log(`No active Meta connection found for brand ${brandId}`)
      return NextResponse.json({ error: 'No active Meta connection found' }, { status: 404 })
    }
    
    console.log(`Found Meta connection: ${connection.id} for brand ${brandId}`)
    
    // Check if we're requesting data for today (midnight boundary handling)
    // Use local date to properly handle timezone boundaries
    const today = new Date()
    const localToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    const isRequestingToday = to === localToday
    
          if (isRequestingToday) {
        console.log(`[META API] Requesting data for today (${localToday}) - checking for midnight boundary issues`)
      }
    
    // Handle date range with more precision for exact queries
    let fromDate: string
    let toDate: string
    let requestedFromDate: string | null = null
    let requestedToDate: string | null = null
    
    // Special handling for yesterday preset
    if (isYesterdayPreset) {
      console.log('YESTERDAY PRESET DETECTED FROM PARAMETER');
      
      // Use exactly yesterday's date for both from and to (local timezone)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      fromDate = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
      toDate = fromDate; // Same day - critical for yesterday only
      
      requestedFromDate = fromDate;
      requestedToDate = toDate;
      
      console.log(`STRICT YESTERDAY HANDLING: Forcing yesterday-only query: from=${fromDate}, to=${toDate}`);
    } else if (from && to) {
      // Save the original requested dates for verification
      requestedFromDate = from
      requestedToDate = to
      
      // Use the exact dates specified - but ensure they're valid
      try {
        const fromDateObj = new Date(from);
        fromDate = fromDateObj.toISOString().split('T')[0];
        
        const toDateObj = new Date(to);
        toDate = toDateObj.toISOString().split('T')[0];
        
        // Special case - if from and to are the same date, this is a single day query
        if (fromDate === toDate) {
          console.log(`Single day query detected: ${fromDate}`);
          
          // Check if this is "yesterday" query (local timezone)
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
          
          if (fromDate === yesterdayStr) {
            console.log(`YESTERDAY SPECIAL CASE DETECTED: ${yesterdayStr}`);
            // Ensure we only get yesterday's data exactly (not including today)
            fromDate = yesterdayStr;
            toDate = yesterdayStr;
            
            // Mark this as a yesterday preset for special handling
            isYesterdayPreset = true;
            
            console.log(`STRICT YESTERDAY QUERY: Setting exact date query for yesterday only: from=${fromDate}, to=${toDate}`);
          }
        }
        
        // Special case - Check specifically for yesterday preset even if from/to aren't identical
        // This catches cases where the preset was selected but the dates were adjusted
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        // More aggressive check for yesterday data
        if (requestedFromDate?.includes('yesterday') || requestedToDate?.includes('yesterday') ||
            from === 'yesterday' || to === 'yesterday' ||
            preset === 'yesterday' ||
            (fromDate && fromDate.includes(yesterdayStr) && toDate && toDate.includes(yesterdayStr))) {
          console.log(`YESTERDAY PRESET DETECTED: Forcing single day query for yesterday only`);
          fromDate = yesterdayStr;
          toDate = yesterdayStr;
          
          // Mark this as a yesterday preset for special handling
          isYesterdayPreset = true;
        }
      } catch (e) {
        console.log(`Error parsing dates: ${e}`);
        
        // For strict date range, return error instead of using default
        if (strictDateRange) {
          return NextResponse.json({ 
            error: 'Invalid date format',
            _dateRange: { error: 'parse_error' } 
          }, { status: 400 })
        }
        
        // Default to last 30 days if date parsing fails 
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        fromDate = startDate.toISOString().split('T')[0];
        toDate = endDate.toISOString().split('T')[0];
      }
    } else if (strictDateRange) {
      // For strict date mode, we must have both from and to
      return NextResponse.json({ 
        error: 'Both from and to dates are required in strict mode',
        _dateRange: { missing: true } 
      }, { status: 400 })
    } else if (from) {
      // Save the original requested date
      requestedFromDate = from
      
      // If only from is specified, use that date to the current date
      fromDate = new Date(from).toISOString().split('T')[0];
      toDate = new Date().toISOString().split('T')[0];
    } else if (to) {
      // Save the original requested date
      requestedToDate = to
      
      // If only to is specified, use 30 days before to that date
      const toDateObj = new Date(to);
      const fromDateObj = new Date(toDateObj);
      fromDateObj.setDate(fromDateObj.getDate() - 30);
      fromDate = fromDateObj.toISOString().split('T')[0];
      toDate = toDateObj.toISOString().split('T')[0];
    } else {
      // Default: last 30 days
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      fromDate = startDate.toISOString().split('T')[0];
      toDate = endDate.toISOString().split('T')[0];
    }
    
    console.log(`EXACT DATE QUERY: meta_campaign_daily_stats from [${fromDate}] to [${toDate}] for brand ${brandId}`)
    
    if (dateDebug || debug) {
      console.log(`SQL date filters: brand_id=${brandId}, date >= ${fromDate}, date <= ${toDate}`);
      if (requestedFromDate || requestedToDate) {
        console.log(`Original requested dates: from=${requestedFromDate}, to=${requestedToDate}`);
      }
    }
    
    let insightsForProcessing: any[] = [];
    let error: any = null;

    // MODIFIED: Always fetch data from meta_campaign_daily_stats for widgets showing totals
         console.log(`[API /api/metrics/meta] Fetching from meta_campaign_daily_stats for date range: ${fromDate} to ${toDate}`);
        const { data: dailyStatsData, error: dailyStatsError } = await supabase
          .from('meta_campaign_daily_stats')
          .select('date, spend, impressions, clicks, conversions, reach, ctr, cpc')
          .eq('brand_id', brandId)
          .gte('date', fromDate)
          .lte('date', toDate)
          .order('date', { ascending: true });

        if (dailyStatsError) {
          console.error(`[API /api/metrics/meta] Error fetching from meta_campaign_daily_stats:`, dailyStatsError);
      error = dailyStatsError;
        } else if (dailyStatsData && dailyStatsData.length > 0) {
             console.log(`[API /api/metrics/meta] Using ${dailyStatsData.length} records from meta_campaign_daily_stats.`);
            insightsForProcessing = dailyStatsData;
        } else {
          console.log(`[API /api/metrics/meta] No records found in meta_campaign_daily_stats for the range.`);
          
          // No data found for the requested date range - return zeros
          console.log(`[API /api/metrics/meta] No data found for date range, returning zeros`)
          insightsForProcessing = []
          
          // DISABLED: Handle midnight boundary case - was too aggressive and prevented real data
          // The original logic was forcing zero values when no data existed for today
          // if (isRequestingToday && (!dailyStatsData || dailyStatsData.length === 0)) {
          //   console.log(`[META API] Midnight boundary detected: No data exists for today (${today}). Returning zero values instead of trying to sync.`);
          //   
          //   const response = {
          //     adSpend: 0, 
          //     impressions: 0, 
          //     clicks: 0, 
          //     conversions: 0, 
          //     ctr: 0, 
          //     cpc: 0, 
          //     costPerResult: 0, 
          //     dailyData: [],
          //     _dateRange: { 
          //       from: fromDate, 
          //       to: toDate, 
          //       requested: { 
          //         from: requestedFromDate || fromDate, 
          //         to: requestedToDate || toDate 
          //       } 
          //     },
          //     source: 'midnight_boundary_zero_values',
          //     message: 'No data exists for today yet - returning zero values'
          //   };
          //   
          //   // Cache the response with the date-aware cache key
          //   const cacheEntry = {
          //     timestamp: Date.now(),
          //     data: response,
          //     cacheDate: getCurrentDateString()
          //   };
          //   apiCache.set(cacheKey, cacheEntry);
          //   
          //   return NextResponse.json(response);
          // }
      
      // Try to update data for today only if needed and explicitly requested
      const todayForSync = new Date();
      const todayStr = `${todayForSync.getFullYear()}-${String(todayForSync.getMonth() + 1).padStart(2, '0')}-${String(todayForSync.getDate()).padStart(2, '0')}`;
      const isFetchingToday = fromDate === todayStr || toDate === todayStr;
      
      console.log(`🔥🔥🔥 [META API] LIVE SYNC CHECK:`, {
        todayStr,
        fromDate,
        toDate,
        isFetchingToday,
        refresh,
        forceLoad,
        shouldTriggerSync: isFetchingToday && (refresh || forceLoad)
      });
      
      if (isFetchingToday && (refresh || forceLoad)) {
        console.log(`🔥🔥🔥 [META API] TRIGGERING LIVE SYNC for today's data (brand: ${brandId})`);
        try {
          const syncResult = await fetchMetaAdInsights(brandId, new Date(todayStr), new Date(todayStr));
          console.log(`🔥🔥🔥 [META API] LIVE SYNC RESULT:`, {
            success: syncResult.success,
            count: syncResult.count,
            error: syncResult.error
          });
          
          if (syncResult.success) {
            console.log(`🔥🔥🔥 [META API] Today's data sync successful. Count: ${syncResult.count}`);
            // After sync, check meta_campaign_daily_stats again
            const { data: refreshedDailyStats, error: refreshError } = await supabase
              .from('meta_campaign_daily_stats')
              .select('date, spend, impressions, clicks, conversions, reach, ctr, cpc')
              .eq('brand_id', brandId)
              .gte('date', fromDate)
              .lte('date', toDate)
              .order('date', { ascending: true });
              
            if (refreshError) {
              console.error(`🔥🔥🔥 [META API] Error fetching refreshed data:`, refreshError);
            } else if (refreshedDailyStats && refreshedDailyStats.length > 0) {
              console.log(`🔥🔥🔥 [META API] Found ${refreshedDailyStats.length} records after sync`);
              console.log(`🔥🔥🔥 [META API] Fresh data sample:`, refreshedDailyStats[0]);
              insightsForProcessing = refreshedDailyStats;
            } else {
              console.log(`🔥🔥🔥 [META API] No records found after sync - this is the problem!`);
            }
          } else {
            console.log(`🔥🔥🔥 [META API] LIVE SYNC FAILED:`, syncResult.error);
          }
        } catch (syncError) {
          console.error(`🔥🔥🔥 [META API] Exception during data sync:`, syncError);
            }
      } else {
        console.log(`🔥🔥🔥 [META API] SKIPPING LIVE SYNC because isFetchingToday=${isFetchingToday}, refresh=${refresh}, forceLoad=${forceLoad}`);
      }
    }

    if (error && insightsForProcessing.length === 0) {
      console.log(`[API /api/metrics/meta] Error retrieving Meta data and no data to process: ${JSON.stringify(error)}`);
      // Return a successful response with zeroed-out data instead of a 500 error.
      return NextResponse.json({
        adSpend: 0, impressions: 0, clicks: 0, conversions: 0, ctr: 0, cpc: 0, costPerResult: 0, dailyData: [],
        _dateRange: { from: fromDate, to: toDate, requested: { from: requestedFromDate || fromDate, to: requestedToDate || toDate } },
        _notice: "No data found for the specified period, and an error occurred during fetch."
      }, { status: 200 });
    }
      
    // Format the insights (now always from meta_campaign_daily_stats for totals)
    let formattedInsights = insightsForProcessing.map(stat => ({
      date: stat.date,
      spend: stat.spend?.toString() || "0",
      impressions: stat.impressions?.toString() || "0",
      clicks: stat.clicks?.toString() || "0",
      conversions: stat.conversions?.toString() || "0",
      reach: stat.reach?.toString() || "0",
      ctr: stat.ctr?.toString() || "0",
      cpc: stat.cpc?.toString() || "0",
      actions: stat.actions || [], 
      action_values: stat.action_values || [],
      connection_id: connection.id 
    }));
    
    // Apply date filtering if needed
      if (isYesterdayPreset) {
        console.log(`YESTERDAY VALIDATION: Filtering data to ensure exact match for ${fromDate}`);
      formattedInsights = formattedInsights.filter(item => {
          const dateStart = new Date(item.date).toISOString().split('T')[0];
          const exactMatch = dateStart === fromDate;
        if (!exactMatch) console.log(`Filtering out non-yesterday data point: ${dateStart} (expected ${fromDate})`);
          return exactMatch;
        });
      console.log(`YESTERDAY VALIDATION: After filtering, kept ${formattedInsights.length} records out of ${(insightsForProcessing || []).length}`);
      
        if (refresh) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];
          if (fromDate !== yesterdayStr || toDate !== yesterdayStr) {
            console.warn(`REFRESH WARNING: Date mismatch - expected ${yesterdayStr} but got ${fromDate} to ${toDate}`);
            fromDate = yesterdayStr;
            toDate = yesterdayStr;
            formattedInsights = formattedInsights.filter(item => {
              const itemDate = new Date(item.date).toISOString().split('T')[0];
              return itemDate === yesterdayStr;
            });
            console.log(`REFRESH CORRECTION: Re-filtered to ${formattedInsights.length} records with date ${yesterdayStr}`);
          }
        }
      }
    else if (fromDate === toDate) { // Single day query
        console.log(`SINGLE DAY VALIDATION: Filtering data to ensure exact match for ${fromDate}`);
      formattedInsights = formattedInsights.filter(item => {
          const dateStart = new Date(item.date).toISOString().split('T')[0];
          return dateStart === fromDate;
        });
      console.log(`SINGLE DAY VALIDATION: After filtering, kept ${formattedInsights.length} records out of ${(insightsForProcessing || []).length}`);
      }
      
    if (!formattedInsights || formattedInsights.length === 0) {
      console.log(`[API /api/metrics/meta] No data found to process for date range ${fromDate} to ${toDate}`);
        return NextResponse.json({
        adSpend: 0, impressions: 0, clicks: 0, conversions: 0, ctr: 0, cpc: 0, costPerResult: 0, dailyData: [],
        _dateRange: { from: fromDate, to: toDate, requested: { from: requestedFromDate || fromDate, to: requestedToDate || toDate } }
      });
    }

    console.log(`[API /api/metrics/meta] Processing ${formattedInsights.length} records for period ${fromDate} to ${toDate}`);
    const processedData = processMetaData(formattedInsights);
      
      // Add date range info to help client validate
      const response = {
        ...processedData,
        _dateRange: {
          from: fromDate,
          to: toDate,
          requested: { 
            from: requestedFromDate || fromDate, 
            to: requestedToDate || toDate 
          },
          isYesterdayPreset: isYesterdayPreset,
          isSingleDay: fromDate === toDate,
          actualDataDates: processedData.dailyData?.map((day: any) => day.date).sort() || [],
        dataSource: 'meta_campaign_daily_stats' // Added to indicate the source of data
        }
      };
      
      // 🔥🔥🔥 MAJOR DEBUG: Log the actual data being returned
      console.log(`🔥🔥🔥 [META API] RETURNING DATA:`, {
        adSpend: response.adSpend,
        impressions: response.impressions,
        clicks: response.clicks,
        conversions: response.conversions,
        roas: response.roas,
        ctr: response.ctr,
        cpc: response.cpc,
        dailyDataCount: response.dailyData?.length || 0,
        fromDate,
        toDate,
        cacheKey,
        willBeCached: !bypassCache && !refresh
      });
      
      // Cache the response (unless bypass requested)
      if (!bypassCache && !refresh) {
        console.log(`🔥🔥🔥 [META API] CACHING RESPONSE for future requests with key: ${cacheKey}`);
        apiCache.set(cacheKey, { timestamp: Date.now(), data: response, cacheDate: currentDate });
      } else {
        console.log(`🔥🔥🔥 [META API] NOT CACHING RESPONSE because bypassCache=${bypassCache}, refresh=${refresh}`);
      }
      
      return NextResponse.json(response)
  } catch (error) {
    console.error('Error processing Meta metrics:', error)
    return NextResponse.json({ error: 'Failed to process Meta metrics' }, { status: 500 })
  }
}

// Create an empty data structure for when no data is available
function createEmptyDataStructure(): ProcessedMetaData {
  return {
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
  }
}

// Process real Meta data into the format expected by the frontend
function processMetaData(data: any[]): ProcessedMetaData {
  const result = createEmptyDataStructure()
  
  if (!data || data.length === 0) {
    return result
  }
  
  // Sort data by date
  const sortedData = [...data].sort((a, b) => {
    return new Date(a.date).getTime() - new Date(b.date).getTime()
  })
  
  // Calculate total metrics
  let totalSpend = 0
  let totalImpressions = 0
  let totalClicks = 0
  let totalConversions = 0
  let totalReach = 0
  
  // Process daily data
  const dailyData: DailyDataItem[] = []
  const seenDates = new Set<string>()
  
  console.log(`Processing ${sortedData.length} Meta records, sorted from ${sortedData[0]?.date} to ${sortedData[sortedData.length-1]?.date}`)
  
  sortedData.forEach(item => {
    const dateStr = item.date
    
    // Skip if we've already processed this date (aggregate by date)
    if (seenDates.has(dateStr)) return
    seenDates.add(dateStr)
    
    // Aggregate metrics for this date
    const dayItems = sortedData.filter(d => d.date === dateStr)
    
    const daySpend = dayItems.reduce((sum, d) => sum + (parseFloat(d.spend) || 0), 0)
    const dayImpressions = dayItems.reduce((sum, d) => sum + (parseInt(d.impressions) || 0), 0)
    const dayClicks = dayItems.reduce((sum, d) => sum + (parseInt(d.clicks) || 0), 0)
    const dayReach = dayItems.reduce((sum, d) => sum + (parseInt(d.reach) || 0), 0)
    
    // Calculate conversions from actions array (purchase or conversion actions)
    let dayConversions = 0
    dayItems.forEach(d => {
      if (d.actions && Array.isArray(d.actions)) {
        d.actions.forEach((action: any) => {
          if (
            action.action_type === 'purchase' || 
            action.action_type === 'offsite_conversion.fb_pixel_purchase' ||
            action.action_type === 'omni_purchase'
          ) {
            dayConversions += parseFloat(action.value) || 0
          }
        })
      }
    })
    
    // Calculate day CTR and ROAS
    const dayCtr = dayImpressions > 0 ? (dayClicks / dayImpressions) * 100 : 0
    
    // Calculate ROAS (if we have conversion value data)
    let dayRoas = 0
    dayItems.forEach(d => {
      if (d.action_values && Array.isArray(d.action_values)) {
        d.action_values.forEach((actionValue: any) => {
          if (
            actionValue.action_type === 'purchase' || 
            actionValue.action_type === 'offsite_conversion.fb_pixel_purchase' ||
            actionValue.action_type === 'omni_purchase'
          ) {
            dayRoas += parseFloat(actionValue.value) || 0
          }
        })
      }
    })
    dayRoas = daySpend > 0 ? dayRoas / daySpend : 0
    
    // Add to daily data array
    dailyData.push({
      date: dateStr,
      spend: daySpend,
      impressions: dayImpressions,
      clicks: dayClicks,
      conversions: dayConversions,
      ctr: dayCtr,
      roas: dayRoas,
      reach: dayReach
    })
    
    // Add to totals
    totalSpend += daySpend
    totalImpressions += dayImpressions
    totalClicks += dayClicks
    totalConversions += dayConversions
    totalReach += dayReach
  })
  
  console.log(`Aggregated ${dailyData.length} unique days of data, total spend: ${totalSpend}`)
  
  // If the date range is very short (e.g., just today), don't try to calculate growth
  // as it won't be meaningful
  const useHalfPeriodComparison = dailyData.length >= 2
  
  // Calculate growth metrics based on available data
  const impressionGrowth = useHalfPeriodComparison ? calculateGrowth(dailyData, 'impressions') : 0
  const clickGrowth = useHalfPeriodComparison ? calculateGrowth(dailyData, 'clicks') : 0 
  const adSpendGrowth = useHalfPeriodComparison ? calculateGrowth(dailyData, 'spend') : 0
  const conversionGrowth = useHalfPeriodComparison ? calculateGrowth(dailyData, 'conversions') : 0
  const ctrGrowth = useHalfPeriodComparison ? calculateGrowth(dailyData, 'ctr') : 0
  const roasGrowth = useHalfPeriodComparison ? calculateGrowth(dailyData, 'roas') : 0
  
  // Calculate overall metrics
  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
  const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0
  const cpcLink = totalClicks > 0 ? totalSpend / totalClicks : 0
  const costPerResult = totalConversions > 0 ? totalSpend / totalConversions : 0
  const roas = totalSpend > 0 ? (totalConversions * 50) / totalSpend : 0 // Assuming $50 per conversion if not available
  const cprGrowth = useHalfPeriodComparison ? calculateGrowth(dailyData, 'cost_per_conversion') : 0 // Use correct metric name
  const frequency = 0 // Cannot calculate frequency without correct totalReach
  
  // Add debug info
  console.log(`>>> [API Meta Metrics] Processed metrics (Reach removed): adSpend=${totalSpend}, impressions=${totalImpressions}, clicks=${totalClicks}, ctr=${ctr.toFixed(2)}%`)
  
  return {
    adSpend: totalSpend,
    adSpendGrowth,
    impressions: totalImpressions,
    impressionGrowth,
    clicks: totalClicks,
    clickGrowth,
    conversions: totalConversions,
    conversionGrowth,
    ctr,
    ctrGrowth,
    cpc,
    cpcLink,
    costPerResult,
    cprGrowth,
    roas,
    roasGrowth, 
    frequency: 0, // Placeholder
    budget: totalSpend > 0 ? totalSpend / dailyData.length : 0, // Average daily budget
    reach: 0, // Placeholder - needs correct implementation
    dailyData
  }
}

/**
 * Calculate growth percentage between current and previous period
 */
function calculateGrowth(dailyData: DailyDataItem[], metric: string): number {
  if (!dailyData || dailyData.length < 2) {
    console.log(`Cannot calculate growth for ${metric}: not enough data points (${dailyData?.length || 0})`)
    return 0
  }
  
  // Ensure data is sorted by date (critical for proper comparison)
  const sortedData = [...dailyData].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  )
  
  // Check if we're dealing with a single day view (all data from same date)
  const uniqueDates = new Set(sortedData.map(d => d.date)).size;
  if (uniqueDates === 1) {
    console.log(`Single day view detected for ${metric}. Finding previous day data...`);
    
    // This is a single day view - we need to compare with the previous day's data
    // Get the current date from the data
    const currentDate = new Date(sortedData[0].date);
    
    // Get the previous day's date
    const previousDate = new Date(currentDate);
    previousDate.setDate(previousDate.getDate() - 1);
    const previousDateStr = previousDate.toISOString().split('T')[0];
    
    console.log(`Current day: ${currentDate.toISOString().split('T')[0]}, Previous day: ${previousDateStr}`);
    
    // Calculate current day total
    const currentDayTotal = sortedData.reduce((sum, item) => {
      const value = typeof item[metric] === 'number' ? item[metric] : 0;
      return sum + (value as number);
    }, 0);
    
    // For previous day, we don't have data in our current dataset (we only loaded the requested date range)
    // In this case, we should return 0% growth since we can't calculate it accurately
    console.log(`Single day view for ${metric}: ${currentDayTotal}. Cannot compare with previous day.`);
    return 0;
  }
  
  // For regular date ranges (not single day), do time-based split
  const dates = sortedData.map(d => new Date(d.date).getTime())
  const oldestDate = Math.min(...dates)
  const newestDate = Math.max(...dates)
  const midpointDate = oldestDate + (newestDate - oldestDate) / 2
  
  let firstHalf = sortedData.filter(d => new Date(d.date).getTime() < midpointDate)
  let secondHalf = sortedData.filter(d => new Date(d.date).getTime() >= midpointDate)
  
  // If either period has no data points, use a simpler split
  if (firstHalf.length === 0 || secondHalf.length === 0) {
    const midpoint = Math.floor(sortedData.length / 2);
    console.log(`Using simple split as time-based split produced empty periods`);
    firstHalf = sortedData.slice(0, midpoint);
    secondHalf = sortedData.slice(midpoint);
  }
  
  // Log periods for debugging
  if (firstHalf.length > 0 && secondHalf.length > 0) {
    console.log(`Growth calculation for ${metric}:`)
    console.log(`- First period: ${firstHalf[0].date} to ${firstHalf[firstHalf.length-1].date} (${firstHalf.length} days)`)
    console.log(`- Second period: ${secondHalf[0].date} to ${secondHalf[secondHalf.length-1].date} (${secondHalf.length} days)`)
  }
  
  // Calculate totals for both periods
  const calculateTotal = (data: DailyDataItem[]) => {
    return data.reduce((sum, item) => {
      const value = typeof item[metric] === 'number' ? item[metric] : 0
      return sum + (value as number)
    }, 0)
  }
  
  // Calculate avg per day to normalize periods of different lengths
  const firstHalfTotal = calculateTotal(firstHalf)
  const secondHalfTotal = calculateTotal(secondHalf)
  const firstHalfAvgPerDay = firstHalf.length > 0 ? firstHalfTotal / firstHalf.length : 0
  const secondHalfAvgPerDay = secondHalf.length > 0 ? secondHalfTotal / secondHalf.length : 0
  
  // Log values for debugging
  console.log(`- Previous total ${metric}: ${firstHalfTotal} (${firstHalfAvgPerDay.toFixed(2)}/day)`)
  console.log(`- Current total ${metric}: ${secondHalfTotal} (${secondHalfAvgPerDay.toFixed(2)}/day)`)
  
  // Handle zero previous value correctly
  if (firstHalfAvgPerDay === 0 || Math.abs(firstHalfAvgPerDay) < 0.0001) {
    // If both are zero/tiny, no change
    if (secondHalfAvgPerDay === 0 || Math.abs(secondHalfAvgPerDay) < 0.0001) {
      return 0;
    }
    // If only previous is zero but current has value, show 100% increase
    return 100;
  }
  
  // Calculate growth rate using the daily averages to account for different period lengths
  const growthRate = ((secondHalfAvgPerDay - firstHalfAvgPerDay) / firstHalfAvgPerDay) * 100
  
  // Cap extreme values to prevent UI issues with giant percentages
  if (growthRate > 500) return 500
  if (growthRate < -500) return -500
  
  // Round to one decimal place to avoid floating point issues
  const roundedGrowthRate = Math.round(growthRate * 10) / 10
  
  console.log(`- Growth rate for ${metric}: ${roundedGrowthRate.toFixed(1)}%`)
  
  return roundedGrowthRate
} 