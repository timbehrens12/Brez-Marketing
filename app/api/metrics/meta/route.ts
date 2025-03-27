import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'

// Define interfaces for our data types
interface MetaDataItem {
  spend: string;
  impressions: string;
  clicks: string;
  conversions: string;
  reach: string;
  inline_link_clicks: string;
  date_start: string;
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

// Add a simple in-memory cache for identical requests
const apiCache = new Map();
const CACHE_TTL = 60000; // 1 minute cache duration

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const brandId = url.searchParams.get('brandId')
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    const bypassCache = url.searchParams.get('bypass_cache') === 'true'
    const forceLoad = url.searchParams.get('force_load') === 'true'
    const debug = url.searchParams.get('debug') === 'true'
    const dateDebug = url.searchParams.get('date_debug') === 'true'
    const strictDateRange = url.searchParams.get('strict_date_range') === 'true'
    const refresh = url.searchParams.get('refresh') === 'true'
    const preset = url.searchParams.get('preset')
    
    // Check for yesterday preset explicitly
    let isYesterdayPreset = preset === 'yesterday';
    
    // Create a cache key from the request parameters
    const cacheKey = `meta-metrics-${brandId}-${from}-${to}${isYesterdayPreset ? '-yesterday' : ''}`;
    
    // Add detailed logging to troubleshoot date filtering issues
    console.log(`Meta metrics request - brandId: ${brandId}, from: ${from}, to: ${to}, preset: ${preset}, bypassCache: ${bypassCache}, strictDateRange: ${strictDateRange}`)
    
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
      if (cachedResponse) {
        const { timestamp, data } = cachedResponse;
        if (Date.now() - timestamp < CACHE_TTL) {
          console.log(`Returning cached Meta metrics for ${cacheKey}`);
          return NextResponse.json(data);
        } else {
          // Cache expired, remove it
          apiCache.delete(cacheKey);
        }
      }
    } else {
      console.log(`Bypassing cache for ${cacheKey}`);
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
    
    // Handle date range with more precision for exact queries
    let fromDate: string
    let toDate: string
    let requestedFromDate: string | null = null
    let requestedToDate: string | null = null
    
    // Special handling for yesterday preset
    if (isYesterdayPreset) {
      console.log('YESTERDAY PRESET DETECTED FROM PARAMETER');
      
      // Use exactly yesterday's date for both from and to
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      fromDate = yesterday.toISOString().split('T')[0];
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
          
          // Check if this is "yesterday" query
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];
          
          if (fromDate === yesterdayStr) {
            console.log(`YESTERDAY SPECIAL CASE DETECTED: ${yesterdayStr}`);
            // Ensure we only get yesterday's data exactly (not including today)
            fromDate = yesterdayStr;
            toDate = yesterdayStr;
            
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
    
    console.log(`EXACT DATE QUERY: meta_ad_insights from [${fromDate}] to [${toDate}] for connection ${connection.id}`)
    
    if (dateDebug || debug) {
      console.log(`SQL date filters: connection_id=${connection.id}, date >= ${fromDate}, date <= ${toDate}`);
      if (requestedFromDate || requestedToDate) {
        console.log(`Original requested dates: from=${requestedFromDate}, to=${requestedToDate}`);
      }
    }
    
    // Query meta_ad_insights for this time period
    const { data: insights, error } = await supabase
      .from('meta_ad_insights')
      .select('*')
      .eq('connection_id', connection.id)
      .gte('date_start', fromDate)
      .lte('date_start', toDate)
      .order('date_start', { ascending: true })
    
    if (error) {
      console.log(`Error retrieving Meta insights: ${JSON.stringify(error)}`)
      return NextResponse.json({ error: 'Error retrieving Meta insights', details: error }, { status: 500 })
    }
    
    // Additional validation for yesterday preset to ensure we only have yesterday's data
    let filteredInsights = insights || [];
    
    if (isYesterdayPreset) {
      console.log(`YESTERDAY VALIDATION: Filtering data to ensure exact match for ${fromDate}`);
      
      // For yesterday preset, strictly filter to only include data from yesterday
      filteredInsights = filteredInsights.filter(item => {
        // Normalize the date format for comparison
        const dateStart = new Date(item.date_start).toISOString().split('T')[0];
        const exactMatch = dateStart === fromDate;
        
        if (!exactMatch) {
          console.log(`Filtering out non-yesterday data point: ${dateStart} (expected ${fromDate})`);
        }
        
        return exactMatch;
      });
      
      console.log(`YESTERDAY VALIDATION: After filtering, kept ${filteredInsights.length} records out of ${insights?.length || 0}`);
    }
    
    // If no insights found, return empty data
    if (!filteredInsights || filteredInsights.length === 0) {
      console.log(`No Meta insights found for the date range ${fromDate} to ${toDate}`)
      return NextResponse.json({
        adSpend: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        ctr: 0,
        cpc: 0,
        costPerResult: 0,
        dailyData: [],
        _dateRange: {
          from: fromDate,
          to: toDate
        }
      })
    }
    
    console.log(`Found ${filteredInsights.length} Meta data records for period ${fromDate} to ${toDate}`)
    
    // Process the Meta data
    const processedData = processMetaData(filteredInsights)
    
    // Log a sample of what we're actually returning
    console.log(`Meta metrics response data for ${cacheKey}:`, {
      adSpend: processedData.adSpend,
      impressions: processedData.impressions,
      clicks: processedData.clicks,
      roas: processedData.roas,
      dailyDataCount: processedData.dailyData?.length || 0
    });
    
    // Add date range to response for verification
    const responseData = {
      ...processedData,
      _dateRange: {
        from: fromDate,
        to: toDate,
        requested: { 
          from: requestedFromDate || fromDate, 
          to: requestedToDate || toDate 
        }
      }
    };
    
    // Store the response in cache only if not a refresh
    if (!refresh) {
      apiCache.set(cacheKey, {
        timestamp: Date.now(),
        data: responseData
      });
      
      // Clean up old cache entries if cache is getting too large
      if (apiCache.size > 100) {
        const now = Date.now();
        for (const [key, value] of apiCache.entries()) {
          if (now - value.timestamp > CACHE_TTL) {
            apiCache.delete(key);
          }
        }
      }
    }
    
    return NextResponse.json(responseData)
  } catch (error) {
    console.error('Error in Meta metrics endpoint:', error)
    return NextResponse.json({ 
      error: 'Server error', 
      details: typeof error === 'object' && error !== null && 'message' in error 
        ? (error.message as string) 
        : 'Unknown error',
      _dateRange: { error: 'server_error' }
    }, { status: 500 })
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
      roas: dayRoas
    })
    
    // Add to totals
    totalSpend += daySpend
    totalImpressions += dayImpressions
    totalClicks += dayClicks
    totalConversions += dayConversions
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
  const cprGrowth = useHalfPeriodComparison ? calculateGrowth(dailyData, 'cpr') : 0
  const frequency = totalReach > 0 ? totalImpressions / totalReach : 1
  
  // Add debug info
  console.log(`Meta metrics calculated: adSpend=${totalSpend}, impressions=${totalImpressions}, clicks=${totalClicks}, ctr=${ctr.toFixed(2)}%`)
  
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
    frequency,
    budget: totalSpend > 0 ? totalSpend / dailyData.length : 0, // Average daily budget
    reach: totalReach,
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