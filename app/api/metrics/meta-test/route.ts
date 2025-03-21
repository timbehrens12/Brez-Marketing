import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

interface MetaDataItem {
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  reach: number;
  ctr: number;
  cpc: number;
  frequency: number;
  date: string;
}

interface DailyDataItem {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  roas: number;
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
    const { searchParams } = new URL(request.url)
    const brandId = searchParams.get('brandId')
    
    if (!brandId) {
      return NextResponse.json({ error: 'brandId is required' }, { status: 400 })
    }

    // Get test data from our test tables
    const { data: metaTestData, error: metaError } = await supabase
      .from('meta_test_insights')
      .select('*')
      .eq('brand_id', brandId)
      .order('date', { ascending: false })
      .limit(90)
    
    if (metaError) {
      console.error('Error fetching Meta test data:', metaError)
      return NextResponse.json({ error: 'Failed to fetch Meta test data' }, { status: 500 })
    }
    
    // Process the test data
    const processedData = processMetaData(metaTestData || [])
    
    return NextResponse.json(processedData)
    
  } catch (error) {
    console.error('Error in Meta test data API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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
    roas: 2.5, // Default ROAS value for testing
    roasGrowth: 0,
    frequency: 0,
    budget: 0,
    reach: 0,
    dailyData: []
  }
}

function processMetaData(data: MetaDataItem[]): ProcessedMetaData {
  if (!data || data.length === 0) {
    return createEmptyDataStructure()
  }
  
  const result = createEmptyDataStructure()
  
  // Calculate totals for current period (last 30 days)
  const currentPeriodData = data.slice(0, 30)
  const previousPeriodData = data.slice(30, 60)
  
  // Calculate totals for current period
  let totalSpend = 0
  let totalImpressions = 0
  let totalClicks = 0
  let totalConversions = 0
  let totalReach = 0
  
  currentPeriodData.forEach(item => {
    totalSpend += Number(item.spend) || 0
    totalImpressions += Number(item.impressions) || 0
    totalClicks += Number(item.clicks) || 0
    totalConversions += Number(item.conversions) || 0
    totalReach += Number(item.reach) || 0
  })
  
  // Calculate previous period metrics for growth calculation
  let prevTotalSpend = 0
  let prevTotalImpressions = 0
  let prevTotalClicks = 0
  let prevTotalConversions = 0
  
  previousPeriodData.forEach(item => {
    prevTotalSpend += Number(item.spend) || 0
    prevTotalImpressions += Number(item.impressions) || 0
    prevTotalClicks += Number(item.clicks) || 0
    prevTotalConversions += Number(item.conversions) || 0
  })
  
  // Set the metrics
  result.adSpend = totalSpend
  result.impressions = totalImpressions
  result.clicks = totalClicks
  result.conversions = totalConversions
  result.reach = totalReach
  
  // Calculate averages and derived metrics
  result.ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
  result.cpc = totalClicks > 0 ? totalSpend / totalClicks : 0
  result.costPerResult = totalConversions > 0 ? totalSpend / totalConversions : 0
  result.frequency = currentPeriodData.length > 0 
    ? currentPeriodData.reduce((sum, item) => sum + (Number(item.frequency) || 0), 0) / currentPeriodData.length 
    : 0
  
  // Calculate growth metrics
  result.adSpendGrowth = calculateGrowth(totalSpend, prevTotalSpend)
  result.impressionGrowth = calculateGrowth(totalImpressions, prevTotalImpressions)
  result.clickGrowth = calculateGrowth(totalClicks, prevTotalClicks)
  result.conversionGrowth = calculateGrowth(totalConversions, prevTotalConversions)
  result.ctrGrowth = calculateGrowth(result.ctr, prevTotalImpressions > 0 ? (prevTotalClicks / prevTotalImpressions) * 100 : 0)
  result.cprGrowth = calculateGrowth(result.costPerResult, prevTotalConversions > 0 ? prevTotalSpend / prevTotalConversions : 0)
  
  // Set ROAS - for testing, we'll generate a reasonable value and trend
  result.roas = (2 + Math.random() * 3).toFixed(2) as unknown as number // Random ROAS between 2 and 5
  result.roasGrowth = (Math.random() > 0.5 ? 1 : -1) * (5 + Math.random() * 15) // Random growth between -20% and +20%
  
  // Process daily data
  result.dailyData = data.map(item => {
    const dailyRoas = (1.5 + Math.random() * 3).toFixed(2) as unknown as number // Random ROAS between 1.5 and 4.5
    
    return {
      date: item.date,
      spend: Number(item.spend) || 0,
      impressions: Number(item.impressions) || 0,
      clicks: Number(item.clicks) || 0,
      conversions: Number(item.conversions) || 0,
      ctr: Number(item.ctr) || 0,
      roas: dailyRoas
    }
  })
  
  return result
}

function calculateGrowth(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0
  }
  
  return ((current - previous) / previous) * 100
}

// API endpoint for test campaigns
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const brandId = searchParams.get('brandId')
    
    if (!brandId) {
      return NextResponse.json({ error: 'brandId is required' }, { status: 400 })
    }

    // Get test campaign data
    const { data: campaigns, error: campaignsError } = await supabase
      .from('meta_test_campaigns')
      .select('*')
      .eq('brand_id', brandId)
      .order('roas', { ascending: false })
    
    if (campaignsError) {
      console.error('Error fetching Meta test campaigns:', campaignsError)
      return NextResponse.json({ error: 'Failed to fetch Meta test campaigns' }, { status: 500 })
    }
    
    return NextResponse.json({ campaigns: campaigns || [] })
    
  } catch (error) {
    console.error('Error in Meta test campaigns API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 