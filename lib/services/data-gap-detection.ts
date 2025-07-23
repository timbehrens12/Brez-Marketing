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
    
    // Consider gaps of 2+ days as critical (worth backfilling)
    result.gaps.forEach(gap => {
      if (gap.dayCount >= 2) {
        criticalGaps.push(gap)
      }
    })
  })

  return {
    shouldBackfill: criticalGaps.length > 0 || totalMissingDays >= 3,
    criticalGaps,
    totalMissingDays
  }
} 