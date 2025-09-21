/**
 * Meta Demographics Data API
 * 
 * Serves demographics data to frontend widgets
 * Handles intelligent querying based on date ranges
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getSupabaseClient } from '@/lib/supabase/client'
import MetaDemographicsService from '@/lib/services/metaDemographicsService'
import Redis from 'ioredis'

// Initialize Redis for caching
let redis: Redis | null = null
try {
  if (process.env.REDIS_URL) {
    redis = new Redis(process.env.REDIS_URL)
    redis.on('error', (error) => {
      console.warn('Redis connection error, caching disabled:', error)
      redis = null
    })
  } else {
    console.log('No REDIS_URL provided, caching disabled')
  }
} catch (error) {
  console.error('Redis initialization failed in demographics data API:', error)
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const brandId = searchParams.get('brandId')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const breakdownType = searchParams.get('breakdown') || searchParams.get('breakdownType') || 'age_gender'
    const level = searchParams.get('level') || 'campaign'
    const forceRefresh = searchParams.get('forceRefresh') === 'true'

    if (!brandId) {
      return NextResponse.json({ 
        error: 'Missing required parameter: brandId' 
      }, { status: 400 })
    }

    // If no date range provided, use a default range (last 12 months)
    let finalDateFrom = dateFrom
    let finalDateTo = dateTo
    
    if (!finalDateFrom || !finalDateTo) {
      const today = new Date()
      const yearAgo = new Date()
      yearAgo.setFullYear(yearAgo.getFullYear() - 1)
      
      finalDateFrom = yearAgo.toISOString().split('T')[0]
      finalDateTo = today.toISOString().split('T')[0]
      
      console.log(`[Demographics API] No date range provided, using default: ${finalDateFrom} to ${finalDateTo}`)
    } else {
      console.log(`[Demographics API] Using provided date range: ${finalDateFrom} to ${finalDateTo}`)
    }

    // Verify user has access to this brand (either as owner or through brand_access)
    const supabase = getSupabaseClient()
    
    // First check if user owns the brand
    const { data: brand } = await supabase
      .from('brands')
      .select('user_id')
      .eq('id', brandId)
      .single()

    const isOwner = brand?.user_id === userId
    
    if (!isOwner) {
      // If not owner, check brand_access table
      const { data: brandAccess } = await supabase
        .from('brand_access')
        .select('role')
        .eq('brand_id', brandId)
        .eq('user_id', userId)
        .eq('revoked_at', null)
        .single()

      if (!brandAccess) {
        return NextResponse.json({ error: 'Access denied to this brand' }, { status: 403 })
      }
    }

    // Check cache first (unless force refresh)
    const cacheKey = `demog:v2:${brandId}:${finalDateFrom}:${finalDateTo}:${breakdownType}:${level}`
    
    if (!forceRefresh && redis) {
      try {
        const cached = await redis.get(cacheKey)
        if (cached) {
          const data = JSON.parse(cached)
          return NextResponse.json({
            success: true,
            data,
            cached: true,
            breakdown_type: breakdownType,
            date_range: { from: finalDateFrom, to: finalDateTo }
          })
        }
      } catch (cacheError) {
        console.error('Cache read error:', cacheError)
      }
    }

    // First, let's see what date ranges are available in the database
    console.log(`[Demographics API] Checking available date ranges for brand ${brandId}`)
    
    const { data: availableRanges } = await supabase
      .from('meta_demographics')
      .select('breakdown_type, date_range_start, date_range_end')
      .eq('brand_id', brandId)
      .order('date_range_start', { ascending: false })
      .limit(10)
    
    if (availableRanges && availableRanges.length > 0) {
      console.log(`[Demographics API] Available date ranges in meta_demographics:`)
      availableRanges.forEach(range => {
        console.log(`  ${range.breakdown_type}: ${range.date_range_start} to ${range.date_range_end}`)
      })
    } else {
      console.log(`[Demographics API] No date ranges found in meta_demographics for brand ${brandId}`)
    }

    // NUCLEAR FIX: Use meta_device_performance for ALL breakdown types since it's the only one working
    // Map ALL breakdown types to work with the meta_device_performance table structure
    let dbBreakdownType = breakdownType
    
    // Map frontend breakdown types to database breakdown types that exist in meta_device_performance
    if (breakdownType === 'device_platform') {
      dbBreakdownType = 'device'
    } else if (breakdownType === 'placement' || breakdownType === 'publisher_platform') {
      dbBreakdownType = 'platform'
    }
    // For age, gender, age_gender - try them as-is in meta_device_performance first
    
    console.log(`[Demographics API] NUCLEAR FIX: Using meta_device_performance for ALL requests. Querying for ${dbBreakdownType} from ${finalDateFrom} to ${finalDateTo}`)
    
    const result = await supabase
      .from('meta_device_performance')
      .select('*')
      .eq('brand_id', brandId)
      .eq('breakdown_type', dbBreakdownType)
      .gte('date_range_start', finalDateFrom)
      .lte('date_range_start', finalDateTo)
      .order('breakdown_value')
    
    console.log(`[Demographics API] meta_device_performance query result: ${result.data?.length || 0} records`)
    if (result.data && result.data.length > 0) {
      console.log(`[Demographics API] Sample record:`, result.data[0])
    }
    
    const data = result.data || []
    const error = result.error
    
    if (error) {
      console.error('Error fetching demographics data:', error)
      return NextResponse.json({ 
        error: 'Failed to fetch demographics data',
        details: error.message 
      }, { status: 500 })
    }

    // If no data found for the requested date range, check for any available data
    if (!data || data.length === 0) {
      console.log(`[Demographics API] No data found for ${finalDateFrom} to ${finalDateTo}`)
      
      // Check if ANY data exists for this brand and breakdown type
      let anyDataResult
      if (['device_platform', 'placement', 'publisher_platform', 'device', 'platform'].includes(breakdownType)) {
        const dbBreakdownType = breakdownType === 'device_platform' ? 'device' 
                               : breakdownType === 'placement' ? 'platform'
                               : breakdownType === 'publisher_platform' ? 'platform'
                               : breakdownType
        
        anyDataResult = await supabase
          .from('meta_device_performance')
          .select('date_range_start, date_range_end')
          .eq('brand_id', brandId)
          .eq('breakdown_type', dbBreakdownType)
          .order('date_range_start', { ascending: false })
          .limit(1)
      } else {
        anyDataResult = await supabase
          .from('meta_demographics')
          .select('date_range_start, date_range_end')
          .eq('brand_id', brandId)
          .eq('breakdown_type', breakdownType)
          .order('date_range_start', { ascending: false })
          .limit(1)
      }
      
      if (anyDataResult.data && anyDataResult.data.length > 0) {
        const latestDate = anyDataResult.data[0].date_range_start
        console.log(`[Demographics API] Latest available data is from ${latestDate}, but requested ${finalDateFrom} to ${finalDateTo}`)
        
        // Return empty result with metadata about available data
        return NextResponse.json({
          success: true,
          data: [],
          cached: false,
          breakdown_type: breakdownType,
          date_range: { from: finalDateFrom, to: finalDateTo },
          total_records: 0,
          message: 'No data available for requested date range',
          latest_available_date: latestDate,
          requires_sync: true
        })
      } else {
        console.log(`[Demographics API] No data exists at all for brand ${brandId} and breakdown ${breakdownType}`)
        
        return NextResponse.json({
          success: true,
          data: [],
          cached: false,
          breakdown_type: breakdownType,
          date_range: { from: finalDateFrom, to: finalDateTo },
          total_records: 0,
          message: 'No demographics data found',
          requires_sync: true
        })
      }
    }

    // Process and format data for frontend (both tables use breakdown_value)
    let convertedData = data?.map(item => ({
      breakdown_key: item.breakdown_value,
      breakdown_value: item.breakdown_value,
      date_value: item.date_range_start,
      impressions: item.impressions,
      clicks: item.clicks,
      spend: item.spend,
      reach: item.reach,
      conversions: 0, // Demographics data doesn't include conversions
      ctr: item.ctr,
      cpc: item.cpc,
      cpm: item.cpm,
      cost_per_conversion: 0,
      id: item.id // Keep ID for deduplication
    })) || []
    
    // Deduplicate by breakdown_value + date - keep the latest record by ID
    const dedupeMap = new Map();
    convertedData.forEach(item => {
      const key = `${item.breakdown_value}_${item.date_value}`;
      if (!dedupeMap.has(key) || dedupeMap.get(key).id < item.id) {
        dedupeMap.set(key, item);
      }
    });
    convertedData = Array.from(dedupeMap.values());
    
    console.log(`[Demographics API] After deduplication: ${convertedData.length} unique records`);
    
    const formattedData = formatDataForWidget(convertedData, breakdownType)

    // Cache the result for 5 minutes
    if (redis) {
      try {
        await redis.setex(cacheKey, 300, JSON.stringify(formattedData))
      } catch (cacheError) {
        console.error('Cache write error:', cacheError)
      }
    }

    return NextResponse.json({
      success: true,
      data: formattedData,
      cached: false,
      breakdown_type: breakdownType,
      date_range: { from: finalDateFrom, to: finalDateTo },
      total_records: data.length
    })

  } catch (error) {
    console.error('Demographics data API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * Format demographics data for frontend widgets
 */
function formatDataForWidget(data: any[], breakdownType: string): any[] {
  if (!data || data.length === 0) return []

  // Group by breakdown_key and aggregate metrics
  const grouped = data.reduce((acc, item) => {
    const key = item.breakdown_key
    
    if (!acc[key]) {
      acc[key] = {
        breakdown_key: key,
        breakdown_value: formatBreakdownValue(key, breakdownType),
        impressions: 0,
        clicks: 0,
        spend: 0,
        reach: 0,
        conversions: 0,
        ctr: 0,
        cpc: 0,
        cpm: 0,
        cost_per_conversion: 0,
        dates: []
      }
    }

    // Aggregate metrics
    acc[key].impressions += parseInt(item.impressions) || 0
    acc[key].clicks += parseInt(item.clicks) || 0
    acc[key].spend += parseFloat(item.spend) || 0
    acc[key].reach += parseInt(item.reach) || 0
    acc[key].conversions += parseInt(item.conversions) || 0
    
    // Track dates for trend analysis
    acc[key].dates.push({
      date: item.date_value,
      impressions: item.impressions,
      clicks: item.clicks,
      spend: item.spend,
      reach: item.reach
    })

    return acc
  }, {})

  // Convert to array and calculate derived metrics
  const result = Object.values(grouped).map((item: any) => {
    // Calculate derived metrics
    if (item.impressions > 0) {
      item.ctr = (item.clicks / item.impressions) * 100
      item.cpm = (item.spend / item.impressions) * 1000
    }
    
    if (item.clicks > 0) {
      item.cpc = item.spend / item.clicks
    }
    
    if (item.conversions > 0) {
      item.cost_per_conversion = item.spend / item.conversions
    }

    // Sort dates for trend analysis
    item.dates.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())

    return item
  })

  // Sort by impressions descending
  return result.sort((a, b) => b.impressions - a.impressions)
}

/**
 * Format breakdown keys for display
 */
function formatBreakdownValue(key: string, breakdownType: string): string {
  switch (breakdownType) {
    case 'age_gender':
      const [age, gender] = key.split('|')
      return `${age} • ${gender === 'male' ? 'Male' : gender === 'female' ? 'Female' : 'Other'}`
    
    case 'region':
      // Handle country-state format like "US-CA" or just "US"
      if (key.includes('-')) {
        const [country, state] = key.split('-')
        return `${country}-${state}`
      }
      return key
    
    case 'device_platform':
      return key.charAt(0).toUpperCase() + key.slice(1)
    
    case 'placement':
      const [platform, position] = key.split('|')
      return `${platform} • ${position}`
    
    default:
      return key
  }
}

/**
 * Health check endpoint
 */
export async function HEAD(request: NextRequest) {
  return new NextResponse(null, { status: 200 })
}
