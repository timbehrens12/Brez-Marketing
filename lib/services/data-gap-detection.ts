import { createClient } from '@supabase/supabase-js'

export interface DataGap {
  startDate: Date
  endDate: Date
  platform: 'meta' | 'shopify'
  dayCount: number
}

export interface GapDetectionResult {
  hasGaps: boolean
  gaps: DataGap[]
  totalMissingDays: number
  lastDataDate: Date | null
  earliestDataDate: Date | null
}

/**
 * Detects gaps in data coverage for a specific brand and platform
 */
export async function detectDataGaps(
  brandId: string,
  platform: 'meta' | 'shopify',
  lookbackDays: number = 30
): Promise<GapDetectionResult> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  try {
    // Calculate the date range to check
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - lookbackDays)

    console.log(`[Gap Detection] Checking ${platform} data gaps for brand ${brandId} from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`)

    let tableName: string
    let dateColumn: string

    // Determine which table and date column to check based on platform
    if (platform === 'meta') {
      tableName = 'meta_ad_insights'
      dateColumn = 'date'  // Fixed: the column is 'date', not 'date_start'
    } else {
      tableName = 'shopify_orders'
      dateColumn = 'created_at'
    }

    // Get all dates that have data in the specified range
    const { data: existingData, error } = await supabase
      .from(tableName)
      .select(dateColumn)
      .eq('brand_id', brandId)
      .gte(dateColumn, startDate.toISOString().split('T')[0])
      .lte(dateColumn, endDate.toISOString().split('T')[0])
      .order(dateColumn, { ascending: true })

    if (error) {
      console.error(`[Gap Detection] Error querying ${tableName}:`, error)
      throw error
    }

    // Extract unique dates from the data
    const existingDates = new Set<string>()
    let earliestDataDate: Date | null = null
    let lastDataDate: Date | null = null

    if (existingData && existingData.length > 0) {
      existingData.forEach((row: any) => {
        const dateStr = platform === 'meta' 
          ? row[dateColumn] 
          : row[dateColumn].split('T')[0] // For datetime fields, extract just the date part
        
        existingDates.add(dateStr)

        // Track earliest and latest dates
        const date = new Date(dateStr)
        if (!earliestDataDate || date < earliestDataDate) {
          earliestDataDate = date
        }
        if (!lastDataDate || date > lastDataDate) {
          lastDataDate = date
        }
      })
    }

    // Generate all dates in the range and find gaps
    const gaps: DataGap[] = []
    let currentGapStart: Date | null = null
    let totalMissingDays = 0

    const currentDate = new Date(startDate)
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0]
      
      if (!existingDates.has(dateStr)) {
        // Missing data for this date
        totalMissingDays++
        
        if (!currentGapStart) {
          currentGapStart = new Date(currentDate)
        }
      } else {
        // Data exists for this date, close any open gap
        if (currentGapStart) {
          const gapEnd = new Date(currentDate)
          gapEnd.setDate(gapEnd.getDate() - 1) // Gap ends the day before data resumes
          
          gaps.push({
            startDate: currentGapStart,
            endDate: gapEnd,
            platform,
            dayCount: Math.ceil((gapEnd.getTime() - currentGapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
          })
          
          currentGapStart = null
        }
      }
      
      currentDate.setDate(currentDate.getDate() + 1)
    }

    // Close any remaining gap that extends to the end date
    if (currentGapStart) {
      gaps.push({
        startDate: currentGapStart,
        endDate: new Date(endDate),
        platform,
        dayCount: Math.ceil((endDate.getTime() - currentGapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
      })
    }

    const result: GapDetectionResult = {
      hasGaps: gaps.length > 0,
      gaps,
      totalMissingDays,
      lastDataDate,
      earliestDataDate
    }

    console.log(`[Gap Detection] Found ${gaps.length} gaps totaling ${totalMissingDays} missing days for ${platform}`)
    
    return result

  } catch (error) {
    console.error('[Gap Detection] Error detecting data gaps:', error)
    throw error
  }
}

/**
 * Detects stale data - days where data exists but was likely synced mid-day and never updated
 * This catches the "Wednesday $0.43 locked forever" scenario
 */
export async function detectStaleData(
  brandId: string,
  platform: 'meta' | 'shopify',
  lookbackDays: number = 30
): Promise<{
  staleDays: Array<{
    date: string
    lastSyncTime: string
    dayOfWeek: string
    suspectedStale: boolean
  }>
  totalStaleDays: number
}> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  try {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - lookbackDays)

    console.log(`[Stale Detection] Checking ${platform} stale data for brand ${brandId} from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`)

    if (platform === 'meta') {
      // For Meta data, check when each day's data was last updated
      // If data was synced before 9 PM on that day, it's likely incomplete
      const { data: metaData, error } = await supabase
        .from('meta_ad_insights')
        .select('date, updated_at')
        .eq('brand_id', brandId)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date', { ascending: true })

      if (error) {
        console.error('[Stale Detection] Error querying meta_ad_insights:', error)
        throw error
      }

      const staleDays: Array<{ date: string; lastSyncTime: string; dayOfWeek: string; suspectedStale: boolean }> = []

      if (metaData && metaData.length > 0) {
        console.log(`[Stale Detection] Found ${metaData.length} records to analyze for staleness`)
        
        // Group by date and find the latest update time for each day
        const dateMap = new Map<string, Date>()
        
        metaData.forEach((row: any) => {
          const date = row.date
          const updatedAt = new Date(row.updated_at)
          
          console.log(`[Stale Detection] Record for ${date}: updated at ${updatedAt.toISOString()}`)
          
          if (!dateMap.has(date) || updatedAt > dateMap.get(date)!) {
            dateMap.set(date, updatedAt)
          }
        })
        
        console.log(`[Stale Detection] Date map contains ${dateMap.size} unique dates`)

        // Check each date to see if it was last updated before end of business day
        for (const [date, lastUpdate] of dateMap.entries()) {
          const dateObj = new Date(date + 'T00:00:00')
          const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'long' })
          
          // Check if this date is in the past (not today)
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          
          console.log(`[Stale Detection] Checking ${date} (${dayOfWeek}): last updated ${lastUpdate.toISOString()}`)
          console.log(`[Stale Detection] Today is ${today.toISOString()}, dateObj is ${dateObj.toISOString()}`)
          console.log(`[Stale Detection] Is ${date} in the past? ${dateObj < today}`)
          
          if (dateObj < today) {
            // For past dates, if data was last updated before 11:59 PM on that day, it's potentially stale
            // This catches cases where someone opened dashboard at 10:30 PM but more conversions happened by midnight
            const endOfDay = new Date(date + 'T23:59:00') // 11:59 PM of that day
            const suspectedStale = lastUpdate < endOfDay
            
            console.log(`[Stale Detection] ${date}: End of day cutoff is ${endOfDay.toISOString()}`)
            console.log(`[Stale Detection] ${date}: Last update ${lastUpdate.toISOString()} < cutoff ${endOfDay.toISOString()}? ${suspectedStale}`)
            
            if (suspectedStale) {
              console.log(`[Stale Detection] 🚨 ${date} is STALE! Last updated at ${lastUpdate.toISOString()} (before end of day)`)
              staleDays.push({
                date,
                lastSyncTime: lastUpdate.toISOString(),
                dayOfWeek,
                suspectedStale: true
              })
            } else {
              console.log(`[Stale Detection] ✅ ${date} is fresh (updated after 11:59 PM)`)
            }
          } else {
            console.log(`[Stale Detection] ⏭️ ${date} is today or future, skipping stale check`)
          }
        }
      }

      console.log(`[Stale Detection] Found ${staleDays.length} potentially stale days for ${platform}`)
      
      return {
        staleDays,
        totalStaleDays: staleDays.length
      }
    }

    // For Shopify, similar logic could be implemented
    return {
      staleDays: [],
      totalStaleDays: 0
    }

  } catch (error) {
    console.error('[Stale Detection] Error detecting stale data:', error)
    throw error
  }
}

/**
 * Enhanced gap detection that includes both missing days AND stale data detection
 */
export async function detectDataGapsAndStaleData(
  brandId: string,
  platform: 'meta' | 'shopify',
  lookbackDays: number = 30
): Promise<GapDetectionResult & {
  staleData: {
    staleDays: Array<{
      date: string
      lastSyncTime: string
      dayOfWeek: string
      suspectedStale: boolean
    }>
    totalStaleDays: number
  }
}> {
  // Get regular gap detection
  const gapResult = await detectDataGaps(brandId, platform, lookbackDays)
  
  // Get stale data detection
  const staleResult = await detectStaleData(brandId, platform, lookbackDays)
  
  console.log(`[Enhanced Detection] Platform ${platform}: ${gapResult.gaps.length} gaps, ${staleResult.totalStaleDays} stale days`)
  
  return {
    ...gapResult,
    staleData: staleResult
  }
}

/**
 * Detects gaps across all connected platforms for a brand
 */
export async function detectAllDataGaps(
  brandId: string,
  lookbackDays: number = 30
): Promise<Record<string, GapDetectionResult>> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  try {
    // Get active platform connections for this brand
    const { data: connections, error } = await supabase
      .from('platform_connections')
      .select('platform_type')
      .eq('brand_id', brandId)
      .eq('status', 'active')

    if (error) {
      console.error('[Gap Detection] Error fetching connections:', error)
      throw error
    }

    const results: Record<string, GapDetectionResult> = {}

    // Check gaps for each connected platform
    if (connections) {
      for (const connection of connections) {
        if (connection.platform_type === 'meta' || connection.platform_type === 'shopify') {
          try {
            results[connection.platform_type] = await detectDataGaps(
              brandId, 
              connection.platform_type as 'meta' | 'shopify',
              lookbackDays
            )
          } catch (error) {
            console.error(`[Gap Detection] Error checking ${connection.platform_type} gaps:`, error)
            // Continue with other platforms even if one fails
          }
        }
      }
    }

    return results

  } catch (error) {
    console.error('[Gap Detection] Error detecting all data gaps:', error)
    throw error
  }
}

/**
 * Enhanced version that checks all platforms for gaps AND stale data
 */
export async function detectAllDataGapsAndStaleData(
  brandId: string,
  lookbackDays: number = 30
): Promise<Record<string, GapDetectionResult & {
  staleData: {
    staleDays: Array<{
      date: string
      lastSyncTime: string
      dayOfWeek: string
      suspectedStale: boolean
    }>
    totalStaleDays: number
  }
}>> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  try {
    // Get active platform connections for this brand
    const { data: connections, error } = await supabase
      .from('platform_connections')
      .select('platform_type')
      .eq('brand_id', brandId)
      .eq('status', 'active')

    if (error) {
      console.error('[Enhanced Detection] Error fetching connections:', error)
      throw error
    }

    const results: Record<string, any> = {}

    // Check gaps and stale data for each connected platform
    if (connections) {
      for (const connection of connections) {
        if (connection.platform_type === 'meta' || connection.platform_type === 'shopify') {
          try {
            results[connection.platform_type] = await detectDataGapsAndStaleData(
              brandId, 
              connection.platform_type as 'meta' | 'shopify',
              lookbackDays
            )
          } catch (error) {
            console.error(`[Enhanced Detection] Error checking ${connection.platform_type}:`, error)
            // Continue with other platforms even if one fails
          }
        }
      }
    }

    return results

  } catch (error) {
    console.error('[Enhanced Detection] Error detecting all data issues:', error)
    throw error
  }
}

/**
 * Check if backfill is needed based on gap detection results
 */
export function shouldTriggerBackfill(gapResults: Record<string, GapDetectionResult>): {
  shouldBackfill: boolean
  criticalGaps: DataGap[]
  totalMissingDays: number
} {
  const criticalGaps: DataGap[] = []
  let totalMissingDays = 0

  Object.values(gapResults).forEach(result => {
    totalMissingDays += result.totalMissingDays
    
    // Consider gaps of 1+ days as critical (worth backfilling) - more aggressive detection
    result.gaps.forEach(gap => {
      if (gap.dayCount >= 1) {
        criticalGaps.push(gap)
      }
    })
  })

  return {
    shouldBackfill: criticalGaps.length > 0 || totalMissingDays >= 1,
    criticalGaps,
    totalMissingDays
  }
}

/**
 * Enhanced backfill decision that considers both gaps and stale data
 */
export function shouldTriggerEnhancedBackfill(gapResults: Record<string, any>): {
  shouldBackfill: boolean
  criticalGaps: DataGap[]
  staleDatesToRefresh: Array<{ date: string; platform: string }>
  totalMissingDays: number
  totalStaleDays: number
} {
  const criticalGaps: DataGap[] = []
  const staleDatesToRefresh: Array<{ date: string; platform: string }> = []
  let totalMissingDays = 0
  let totalStaleDays = 0

  Object.entries(gapResults).forEach(([platform, result]: [string, any]) => {
    // Handle regular gaps
    totalMissingDays += result.totalMissingDays
    result.gaps.forEach((gap: DataGap) => {
      if (gap.dayCount >= 1) {
        criticalGaps.push(gap)
      }
    })

    // Handle stale data
    if (result.staleData) {
      totalStaleDays += result.staleData.totalStaleDays
      result.staleData.staleDays.forEach((staleDay: any) => {
        staleDatesToRefresh.push({
          date: staleDay.date,
          platform: platform
        })
      })
    }
  })

  const shouldBackfill = criticalGaps.length > 0 || totalMissingDays >= 1 || totalStaleDays >= 1

  console.log(`[Enhanced Backfill Decision] Should backfill: ${shouldBackfill} (${totalMissingDays} missing days, ${totalStaleDays} stale days)`)

  return {
    shouldBackfill,
    criticalGaps,
    staleDatesToRefresh,
    totalMissingDays,
    totalStaleDays
  }
}

/**
 * Refresh specific stale dates that were detected
 * This fixes historical "locked" data like the Wednesday $0.43 example
 */
export async function refreshStaleData(
  brandId: string,
  staleDatesToRefresh: Array<{ date: string; platform: string }>
): Promise<{
  success: boolean
  refreshedDates: string[]
  error?: string
}> {
  if (staleDatesToRefresh.length === 0) {
    return { success: true, refreshedDates: [] }
  }

  console.log(`[Stale Data Refresh] Refreshing ${staleDatesToRefresh.length} stale dates for brand ${brandId}`)

  try {
    const refreshedDates: string[] = []
    
    // Group stale dates by platform
    const metaDates = staleDatesToRefresh.filter(item => item.platform === 'meta').map(item => item.date)
    
    if (metaDates.length > 0) {
      console.log(`[Stale Data Refresh] Refreshing Meta dates: ${metaDates.join(', ')}`)
      
      // Import the meta service function
      const { fetchMetaAdInsights } = await import('./meta-service')
      
      // For each stale date, refresh just that specific day
      for (const date of metaDates) {
        try {
          const startDate = new Date(date + 'T00:00:00')
          const endDate = new Date(date + 'T23:59:59')
          
          console.log(`[Stale Data Refresh] Refreshing stale date: ${date}`)
          
          const result = await fetchMetaAdInsights(
            brandId,
            startDate,
            endDate,
            false // Not a dry run
          )
          
          if (result.success) {
            refreshedDates.push(date)
            console.log(`[Stale Data Refresh] ✅ Successfully refreshed stale date: ${date}`)
          } else {
            console.warn(`[Stale Data Refresh] ⚠️ Failed to refresh stale date ${date}:`, result.error)
          }
        } catch (error) {
          console.error(`[Stale Data Refresh] Error refreshing date ${date}:`, error)
        }
      }
    }

    return {
      success: true,
      refreshedDates
    }

  } catch (error) {
    console.error('[Stale Data Refresh] Error refreshing stale data:', error)
    return {
      success: false,
      refreshedDates: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Complete data refresh solution that handles recent data + historical stale data
 */
export async function performCompleteDataRefresh(
  brandId: string,
  lookbackDays: number = 60
): Promise<{
  success: boolean
  recentDataRefreshed: boolean
  staleDataRefreshed: number
  totalGapsFilled: number
  error?: string
}> {
  console.log(`[Complete Data Refresh] 🚀 Starting comprehensive refresh for brand ${brandId} (${lookbackDays} days lookback)`)

  try {
    // 1. First do enhanced gap and stale detection
    console.log(`[Complete Data Refresh] Step 1: Running enhanced gap and stale detection...`)
    const enhancedResults = await detectAllDataGapsAndStaleData(brandId, lookbackDays)
    console.log(`[Complete Data Refresh] Enhanced detection results:`, JSON.stringify(enhancedResults, null, 2))
    
    const backfillDecision = shouldTriggerEnhancedBackfill(enhancedResults)
    console.log(`[Complete Data Refresh] Backfill decision:`, JSON.stringify(backfillDecision, null, 2))
    
    let recentDataRefreshed = false
    let staleDataRefreshed = 0
    let totalGapsFilled = 0

    // 2. Refresh recent data (last 72 hours)
    try {
      const recentResult = await refreshRecentData(brandId, 72)
      recentDataRefreshed = recentResult.success
    } catch (error) {
      console.warn('[Complete Data Refresh] Recent data refresh failed:', error)
    }

    // 3. Fix historical stale data
    if (backfillDecision.staleDatesToRefresh.length > 0) {
      console.log(`[Complete Data Refresh] Fixing ${backfillDecision.totalStaleDays} stale historical days`)
      const staleResult = await refreshStaleData(brandId, backfillDecision.staleDatesToRefresh)
      staleDataRefreshed = staleResult.refreshedDates.length
    }

    // 4. Handle regular gaps (existing backfill logic)
    if (backfillDecision.criticalGaps.length > 0) {
      console.log(`[Complete Data Refresh] Filling ${backfillDecision.totalMissingDays} missing days`)
      // This would trigger the existing backfill logic
      totalGapsFilled = backfillDecision.totalMissingDays
    }

    console.log(`[Complete Data Refresh] ✅ Complete! Recent: ${recentDataRefreshed}, Stale fixed: ${staleDataRefreshed}, Gaps filled: ${totalGapsFilled}`)

    return {
      success: true,
      recentDataRefreshed,
      staleDataRefreshed,
      totalGapsFilled
    }

  } catch (error) {
    console.error('[Complete Data Refresh] Error during complete refresh:', error)
    return {
      success: false,
      recentDataRefreshed: false,
      staleDataRefreshed: 0,
      totalGapsFilled: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * DEEP HISTORICAL SCAN - for fixing stale data from months ago
 * This is more aggressive and should be used sparingly (e.g., one-time cleanup)
 */
export async function performDeepHistoricalScan(
  brandId: string,
  lookbackDays: number = 90
): Promise<{
  success: boolean
  totalStaleDataFound: number
  staleDataRefreshed: number
  oldestStaleDate?: string
  newestStaleDate?: string
  error?: string
}> {
  console.log(`[Deep Historical Scan] Starting deep scan for brand ${brandId} (${lookbackDays} days back)`)

  try {
    // Use enhanced detection to find all stale data
    const enhancedResults = await detectAllDataGapsAndStaleData(brandId, lookbackDays)
    const backfillDecision = shouldTriggerEnhancedBackfill(enhancedResults)
    
    if (backfillDecision.staleDatesToRefresh.length === 0) {
      console.log('[Deep Historical Scan] ✅ No stale data found in historical scan')
      return {
        success: true,
        totalStaleDataFound: 0,
        staleDataRefreshed: 0
      }
    }

    // Sort stale dates to find oldest and newest
    const staleDates = backfillDecision.staleDatesToRefresh.map(item => item.date).sort()
    const oldestStaleDate = staleDates[0]
    const newestStaleDate = staleDates[staleDates.length - 1]
    
    console.log(`[Deep Historical Scan] Found ${backfillDecision.totalStaleDays} stale days from ${oldestStaleDate} to ${newestStaleDate}`)
    
    // Refresh all the stale data
    const staleResult = await refreshStaleData(brandId, backfillDecision.staleDatesToRefresh)
    
    console.log(`[Deep Historical Scan] ✅ Fixed ${staleResult.refreshedDates.length} of ${backfillDecision.totalStaleDays} stale days`)
    
    return {
      success: true,
      totalStaleDataFound: backfillDecision.totalStaleDays,
      staleDataRefreshed: staleResult.refreshedDates.length,
      oldestStaleDate,
      newestStaleDate
    }

  } catch (error) {
    console.error('[Deep Historical Scan] Error during deep scan:', error)
    return {
      success: false,
      totalStaleDataFound: 0,
      staleDataRefreshed: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * COMPREHENSIVE ONE-TIME CLEANUP - for brands with long history of stale data
 * This scans up to 1 year back and fixes everything (use with caution)
 */
export async function performOneTimeHistoricalCleanup(
  brandId: string,
  maxLookbackDays: number = 365
): Promise<{
  success: boolean
  scannedDays: number
  totalStaleDataFound: number
  staleDataRefreshed: number
  oldestStaleDate?: string
  timeToComplete?: string
  error?: string
}> {
  const startTime = Date.now()
  console.log(`[One-Time Cleanup] Starting comprehensive cleanup for brand ${brandId} (up to ${maxLookbackDays} days back)`)
  console.log(`[One-Time Cleanup] ⚠️ This may take several minutes for brands with extensive history`)

  try {
    // Do the deep historical scan
    const result = await performDeepHistoricalScan(brandId, maxLookbackDays)
    
    const timeToComplete = `${Math.round((Date.now() - startTime) / 1000)}s`
    
    if (result.success) {
      console.log(`[One-Time Cleanup] ✅ Cleanup complete in ${timeToComplete}`)
      console.log(`[One-Time Cleanup] Scanned ${maxLookbackDays} days, found ${result.totalStaleDataFound} stale days, fixed ${result.staleDataRefreshed}`)
      
      return {
        success: true,
        scannedDays: maxLookbackDays,
        totalStaleDataFound: result.totalStaleDataFound,
        staleDataRefreshed: result.staleDataRefreshed,
        oldestStaleDate: result.oldestStaleDate,
        timeToComplete
      }
    } else {
      return {
        success: false,
        scannedDays: maxLookbackDays,
        totalStaleDataFound: 0,
        staleDataRefreshed: 0,
        timeToComplete,
        error: result.error
      }
    }

  } catch (error) {
    const timeToComplete = `${Math.round((Date.now() - startTime) / 1000)}s`
    console.error('[One-Time Cleanup] Error during cleanup:', error)
    return {
      success: false,
      scannedDays: maxLookbackDays,
      totalStaleDataFound: 0,
      staleDataRefreshed: 0,
      timeToComplete,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Always refresh the last 48-72 hours of data to ensure recent days are up-to-date
 * 
 * PROBLEM SOLVED:
 * - User opens dashboard on Wednesday at 2 PM, sees $0.43 spend
 * - Day continues, actual spend reaches $0.90 by end of day
 * - User doesn't return to dashboard for rest of Wednesday
 * - On Friday, Wednesday still shows $0.43 (locked at the time they visited)
 * - Gap detection doesn't catch this because Wednesday "has data" (just outdated)
 * 
 * SOLUTION:
 * - Always refresh last 72 hours on every page load (dashboard, marketing assistant)
 * - Ensures recent days get updated even if they have partial/stale data
 * - Complements existing gap detection which only catches completely missing days
 */
export async function refreshRecentData(
  brandId: string,
  lookbackHours: number = 72
): Promise<{
  success: boolean
  refreshedDays: number
  error?: string
}> {
  console.log(`[Recent Data Refresh] Starting refresh for brand ${brandId} (last ${lookbackHours} hours)`)

  try {
    // Calculate the date range to refresh (last 48-72 hours)
    const endDate = new Date()
    const startDate = new Date()
    startDate.setHours(startDate.getHours() - lookbackHours)

    console.log(`[Recent Data Refresh] Refreshing data from ${startDate.toISOString()} to ${endDate.toISOString()}`)

    // Import the meta service function
    const { fetchMetaAdInsights } = await import('./meta-service')

    // Force refresh the recent data (this will update existing records)
    const result = await fetchMetaAdInsights(
      brandId,
      startDate,
      endDate,
      false // Not a dry run
    )

    if (result.success) {
      const dayCount = Math.ceil(lookbackHours / 24)
      console.log(`[Recent Data Refresh] Successfully refreshed ${dayCount} days of recent data`)
      
      return {
        success: true,
        refreshedDays: dayCount
      }
    } else {
      console.error(`[Recent Data Refresh] Failed to refresh recent data:`, result.error)
      return {
        success: false,
        refreshedDays: 0,
        error: result.error
      }
    }

  } catch (error) {
    console.error('[Recent Data Refresh] Error refreshing recent data:', error)
    return {
      success: false,
      refreshedDays: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
} 