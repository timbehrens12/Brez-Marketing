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

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const brandId = url.searchParams.get('brandId')
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    
    // Validate brandId
    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
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
      return NextResponse.json({ error: 'Error retrieving Meta connection', details: connectionError }, { status: 500 })
    }
    
    if (!connection) {
      return NextResponse.json({ error: 'No active Meta connection found' }, { status: 404 })
    }
    
    // Default date range (last 30 days) if not specified
    const endDate = to ? new Date(to) : new Date()
    const startDate = from ? new Date(from) : new Date(endDate)
    startDate.setDate(startDate.getDate() - 30)
    
    // Format dates for query
    const fromDate = startDate.toISOString().split('T')[0]
    const toDate = endDate.toISOString().split('T')[0]
    
    // Fetch Meta data from meta_ad_insights table
    const { data: metaData, error: metaError } = await supabase
      .from('meta_ad_insights')
      .select('*')
      .eq('connection_id', connection.id)
      .gte('date', fromDate)
      .lte('date', toDate)
      
    if (metaError) {
      return NextResponse.json({ error: 'Error fetching Meta data', details: metaError }, { status: 500 })
    }
    
    // If no data found, return empty structure
    if (!metaData || metaData.length === 0) {
      return NextResponse.json(createEmptyDataStructure())
    }
    
    // Process the Meta data
    const processedData = processMetaData(metaData)
    
    return NextResponse.json(processedData)
  } catch (error) {
    console.error('Error in Meta metrics endpoint:', error)
    return NextResponse.json({ 
      error: 'Server error', 
      details: typeof error === 'object' && error !== null && 'message' in error 
        ? (error.message as string) 
        : 'Unknown error' 
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
  const dateMap = new Map<string, DailyDataItem>()
  
  // First aggregate metrics by date
  sortedData.forEach(item => {
    const dateStr = item.date
    if (!dateStr) return
    
    // Convert string values to numbers for calculations
    const itemSpend = parseFloat(item.spend) || 0
    const itemImpressions = parseInt(item.impressions) || 0
    const itemClicks = parseInt(item.clicks) || 0
    
    // Add to total metrics
    totalSpend += itemSpend
    totalImpressions += itemImpressions
    totalClicks += itemClicks
    
    // Calculate conversions from actions array if present
    let itemConversions = 0
    if (item.actions && Array.isArray(item.actions)) {
      item.actions.forEach((action: any) => {
        if (
          action.action_type === 'purchase' || 
          action.action_type === 'offsite_conversion.fb_pixel_purchase' ||
          action.action_type === 'omni_purchase'
        ) {
          itemConversions += parseInt(action.value) || 0
        }
      })
    }
    totalConversions += itemConversions
    
    // If we already have this date, add to its metrics
    if (dateMap.has(dateStr)) {
      const existing = dateMap.get(dateStr)!
      existing.spend += itemSpend
      existing.impressions += itemImpressions
      existing.clicks += itemClicks
      existing.conversions += itemConversions
    } else {
      // Otherwise create a new entry for this date
      dateMap.set(dateStr, {
        date: dateStr,
        spend: itemSpend,
        impressions: itemImpressions,
        clicks: itemClicks,
        conversions: itemConversions,
        ctr: 0, // Will calculate after all data is aggregated
        roas: 0  // Will calculate after all data is aggregated
      })
    }
  })
  
  // Now calculate derived metrics for each date and convert to array
  dateMap.forEach((item) => {
    // Calculate CTR
    item.ctr = item.impressions > 0 ? (item.clicks / item.impressions) * 100 : 0
    
    // Calculate ROAS (if we have conversion data)
    // For now, using a placeholder calculation - in a real system we'd get actual revenue data
    // This is just for demonstration
    item.roas = item.spend > 0 ? (item.conversions * 50) / item.spend : 0
    
    dailyData.push(item)
  })
  
  // Make sure daily data is sorted by date
  dailyData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  
  // Calculate overall metrics
  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
  const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0
  const cpcLink = totalClicks > 0 ? totalSpend / totalClicks : 0 // Usually these would be different
  const roas = totalSpend > 0 ? (totalConversions * 50) / totalSpend : 0 // Placeholder calculation
  const costPerResult = totalConversions > 0 ? totalSpend / totalConversions : 0
  const frequency = totalReach > 0 ? totalImpressions / totalReach : 0
  
  // Calculate growth metrics (comparing latest data with previous period)
  const halfLength = Math.floor(dailyData.length / 2)
  const recentData = dailyData.slice(halfLength)
  const previousData = dailyData.slice(0, halfLength)
  
  const adSpendGrowth = calculateGrowth(dailyData, 'spend')
  const impressionGrowth = calculateGrowth(dailyData, 'impressions')
  const clickGrowth = calculateGrowth(dailyData, 'clicks')
  const conversionGrowth = calculateGrowth(dailyData, 'conversions')
  const ctrGrowth = calculateGrowth(dailyData, 'ctr')
  const cprGrowth = 0 // Placeholder
  const roasGrowth = calculateGrowth(dailyData, 'roas')
  
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
  if (!dailyData || dailyData.length < 2) return 0
  
  // Split data into two halves to compare
  const midpoint = Math.floor(dailyData.length / 2)
  const firstHalf = dailyData.slice(0, midpoint)
  const secondHalf = dailyData.slice(midpoint)
  
  // Calculate totals for both periods
  const calculateTotal = (data: DailyDataItem[]) => {
    return data.reduce((sum, item) => {
      const value = typeof item[metric] === 'number' ? item[metric] : 0
      return sum + (value as number)
    }, 0)
  }
  
  const previousTotal = calculateTotal(firstHalf)
  const currentTotal = calculateTotal(secondHalf)
  
  // Calculate growth rate
  if (previousTotal === 0) {
    return currentTotal > 0 ? 100 : 0
  }
  
  const growthRate = ((currentTotal - previousTotal) / previousTotal) * 100
  
  // Cap extreme values
  if (growthRate > 1000) return 1000
  if (growthRate < -1000) return -1000
  
  return growthRate
} 