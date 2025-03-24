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
  
  // Sort data by date, with newest dates first
  const sortedData = [...data].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime()
  })
  
  // Get today's date for filtering
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().split('T')[0]
  
  // Filter for today's data to use in metric cards
  const todayData = sortedData.filter(item => item.date === todayStr)
  
  // Calculate total metrics for all dates
  let totalSpend = 0
  let totalImpressions = 0
  let totalClicks = 0
  let totalConversions = 0
  let totalReach = 0
  
  // Calculate today's metrics separately
  let todaySpend = 0
  let todayImpressions = 0
  let todayClicks = 0
  let todayConversions = 0
  
  // Process daily data (organizing by date)
  const dailyData: DailyDataItem[] = []
  const seenDates = new Set<string>()
  
  // First process all dates to build daily data
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
    
    // If this is today, update today's metrics
    if (dateStr === todayStr) {
      todaySpend = daySpend
      todayImpressions = dayImpressions
      todayClicks = dayClicks
      todayConversions = dayConversions
    }
    
    // Add to totals for all time
    totalSpend += daySpend
    totalImpressions += dayImpressions
    totalClicks += dayClicks
    totalConversions += dayConversions
  })
  
  // Sort daily data by date, newest first
  dailyData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  
  // Calculate growth metrics
  const impressionGrowth = calculateGrowth(dailyData, 'impressions')
  const clickGrowth = calculateGrowth(dailyData, 'clicks')
  const adSpendGrowth = calculateGrowth(dailyData, 'spend')
  const conversionGrowth = calculateGrowth(dailyData, 'conversions')
  const ctrGrowth = calculateGrowth(dailyData, 'ctr')
  const roasGrowth = calculateGrowth(dailyData, 'roas')
  
  // Calculate overall metrics
  // Use today's metrics for display if available, otherwise use all-time
  const displaySpend = todayData.length > 0 ? todaySpend : totalSpend
  const displayImpressions = todayData.length > 0 ? todayImpressions : totalImpressions
  const displayClicks = todayData.length > 0 ? todayClicks : totalClicks
  const displayConversions = todayData.length > 0 ? todayConversions : totalConversions
  
  const ctr = displayImpressions > 0 ? (displayClicks / displayImpressions) * 100 : 0
  const cpc = displayClicks > 0 ? displaySpend / displayClicks : 0
  const cpcLink = displayClicks > 0 ? displaySpend / displayClicks : 0
  const costPerResult = displayConversions > 0 ? displaySpend / displayConversions : 0
  const roas = displaySpend > 0 ? (displayConversions * 50) / displaySpend : 0 // Assuming $50 per conversion if not available
  const cprGrowth = calculateGrowth(dailyData, 'cpr')
  const frequency = totalReach > 0 ? totalImpressions / totalReach : 1
  
  return {
    adSpend: displaySpend,
    adSpendGrowth,
    impressions: displayImpressions,
    impressionGrowth,
    clicks: displayClicks,
    clickGrowth,
    conversions: displayConversions,
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
    budget: displaySpend > 0 ? displaySpend : 0, // Daily budget
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