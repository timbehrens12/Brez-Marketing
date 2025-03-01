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
  const { userId } = auth()
  
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }
  
  // Get brandId from query parameters
  const url = new URL(request.url)
  const brandId = url.searchParams.get('brandId')
  
  if (!brandId) {
    return new Response(JSON.stringify({ error: 'Brand ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }
  
  try {
    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // Check if we have real Meta data for this brand
    const { data: metaData, error: metaError } = await supabase
      .from('meta_ad_insights')
      .select('*')
      .eq('brand_id', brandId)
      .order('date_start', { ascending: false })
      .limit(90) // Get last 90 days of data
    
    if (metaError) {
      console.error('Error fetching Meta data:', metaError)
      return new Response(JSON.stringify({ error: 'Failed to fetch Meta data' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    // Process and return the data
    let processedData: ProcessedMetaData;
    
    if (metaData && metaData.length > 0) {
      processedData = processMetaData(metaData)
    } else {
      // If no real data, return empty data structure
      processedData = createEmptyDataStructure()
    }
    
    return new Response(JSON.stringify(processedData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
    
  } catch (error) {
    console.error('Error in Meta metrics API:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
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
function processMetaData(data: MetaDataItem[]): ProcessedMetaData {
  // Calculate total metrics
  const totalSpend = data.reduce((sum: number, item: MetaDataItem) => sum + (parseFloat(item.spend) || 0), 0)
  const totalImpressions = data.reduce((sum: number, item: MetaDataItem) => sum + (parseInt(item.impressions) || 0), 0)
  const totalClicks = data.reduce((sum: number, item: MetaDataItem) => sum + (parseInt(item.clicks) || 0), 0)
  const totalConversions = data.reduce((sum: number, item: MetaDataItem) => sum + (parseInt(item.conversions) || 0), 0)
  const totalReach = data.reduce((sum: number, item: MetaDataItem) => sum + (parseInt(item.reach) || 0), 0)
  const totalLinkClicks = data.reduce((sum: number, item: MetaDataItem) => sum + (parseInt(item.inline_link_clicks) || 0), 0)
  
  // Calculate derived metrics
  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
  const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0
  const cpcLink = totalLinkClicks > 0 ? totalSpend / totalLinkClicks : cpc // Fallback to regular CPC
  const cpa = totalConversions > 0 ? totalSpend / totalConversions : 0
  const roas = totalSpend > 0 ? (totalConversions * 50) / totalSpend : 0 // Assuming $50 value per conversion
  const frequency = totalReach > 0 ? totalImpressions / totalReach : 0
  
  // Estimate budget (this would ideally come from the API, but we'll estimate as 2x spend for now)
  const budget = totalSpend > 0 ? totalSpend * 2 : 0
  
  // Group data by date for daily trends
  const dailyData: DailyDataItem[] = []
  const dateMap: { [key: string]: DailyDataItem } = {}
  
  data.forEach(item => {
    const date = item.date_start
    if (!dateMap[date]) {
      dateMap[date] = {
        date,
        spend: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        ctr: 0,
        roas: 0
      }
    }
    
    const dayData = dateMap[date]
    // Ensure we're adding numbers to numbers by explicitly parsing
    const itemSpend = parseFloat(item.spend) || 0
    const itemImpressions = parseInt(item.impressions) || 0
    const itemClicks = parseInt(item.clicks) || 0
    const itemConversions = parseInt(item.conversions) || 0
    
    dayData.spend += itemSpend
    dayData.impressions += itemImpressions
    dayData.clicks += itemClicks
    dayData.conversions += itemConversions
    
    // Calculate derived metrics for each day
    dayData.ctr = dayData.impressions > 0 ? (dayData.clicks / dayData.impressions) * 100 : 0
    dayData.roas = dayData.spend > 0 ? (dayData.conversions * 50) / dayData.spend : 0 // Assuming $50 value per conversion
  })
  
  // Convert map to array and sort by date
  Object.values(dateMap).forEach(value => dailyData.push(value))
  dailyData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  
  // Return all metrics
  return {
    adSpend: totalSpend,
    adSpendGrowth: calculateGrowth(dailyData, 'spend'),
    impressions: totalImpressions,
    impressionGrowth: calculateGrowth(dailyData, 'impressions'),
    clicks: totalClicks,
    clickGrowth: calculateGrowth(dailyData, 'clicks'),
    conversions: totalConversions,
    conversionGrowth: calculateGrowth(dailyData, 'conversions'),
    ctr: ctr,
    ctrGrowth: 0, // Would need historical data to calculate
    cpc: cpc,
    cpcLink: cpcLink, // Added link click CPC
    costPerResult: cpa,
    cprGrowth: 0, // Would need historical data to calculate
    roas: roas,
    roasGrowth: calculateGrowth(dailyData, 'roas'),
    frequency: frequency, // Added frequency
    budget: budget, // Added estimated budget
    reach: totalReach, // Added reach
    dailyData: dailyData,
  }
}

// Calculate growth percentage between periods
function calculateGrowth(dailyData: DailyDataItem[], metric: string): number {
  if (!dailyData || dailyData.length < 2) return 0
  
  // Split the data into two halves
  const midpoint = Math.floor(dailyData.length / 2)
  const firstHalf = dailyData.slice(0, midpoint)
  const secondHalf = dailyData.slice(midpoint)
  
  // Calculate totals for each half
  const firstTotal = firstHalf.reduce((sum, day) => {
    // Ensure we're adding numbers by using type assertion or conversion
    const value = day[metric]
    return sum + (typeof value === 'number' ? value : 0)
  }, 0)
  
  const secondTotal = secondHalf.reduce((sum, day) => {
    // Ensure we're adding numbers by using type assertion or conversion
    const value = day[metric]
    return sum + (typeof value === 'number' ? value : 0)
  }, 0)
  
  // Calculate growth percentage
  if (firstTotal === 0) return secondTotal > 0 ? 100 : 0
  
  return ((secondTotal - firstTotal) / firstTotal) * 100
} 