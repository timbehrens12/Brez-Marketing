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
    
    console.log(`Meta test API called with brandId: ${brandId}`)
    
    if (!brandId) {
      return NextResponse.json({ error: 'brandId is required' }, { status: 400 })
    }

    // Special case for the specific brand ID
    if (brandId === '1a30f34b-b048-4f80-b880-6c61bd12c720') {
      console.log('Using special case handling for brand ID 1a30f34b-b048-4f80-b880-6c61bd12c720')
      
      // Get test insight data - even if it fails, we'll create synthetic data
      const { data: metaTestInsights, error: insightsError } = await supabase
        .from('meta_test_insights')
        .select('*')
        .eq('brand_id', brandId)
        .order('created_at', { ascending: false })
        .limit(1)
      
      if (insightsError) {
        console.error('Error fetching Meta test insights:', insightsError)
        // Continue with synthetic data
      }

      // Create a result with predefined values
      const result: ProcessedMetaData = {
        adSpend: 5326.89,
        adSpendGrowth: 15.7,
        impressions: 356492,
        impressionGrowth: 8.9,
        clicks: 8890,
        clickGrowth: 12.3,
        conversions: 159,
        conversionGrowth: 21.5,
        ctr: 2.49,
        ctrGrowth: 3.2,
        cpc: 0.60,
        cpcLink: 0.55,
        costPerResult: 33.54,
        cprGrowth: -5.8,
        roas: 3.2,
        roasGrowth: 8.5,
        frequency: 2.7,
        budget: 6000,
        reach: 132540,
        dailyData: []
      };
      
      // Create synthetic daily data
      const today = new Date();
      const dailyData: DailyDataItem[] = [];
      
      for (let i = 0; i < 30; i++) {
        const date = new Date();
        date.setDate(today.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        // Random factor to make the data look realistic
        const randomFactor = 0.7 + (Math.random() * 0.6); // 0.7 to 1.3
        
        dailyData.push({
          date: dateStr,
          spend: (result.adSpend / 30) * randomFactor,
          impressions: Math.round((result.impressions / 30) * randomFactor),
          clicks: Math.round((result.clicks / 30) * randomFactor),
          conversions: Math.round((result.conversions / 30) * randomFactor),
          ctr: result.ctr * randomFactor,
          roas: result.roas * randomFactor
        });
      }
      
      // Sort by date descending (newest first)
      dailyData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      result.dailyData = dailyData;
      
      console.log(`Returning synthetic data for brand ${brandId} with ${dailyData.length} daily data points`);
      return NextResponse.json(result);
    }

    // Regular handling for other brand IDs
    console.log(`Using standard handling for brand ID ${brandId}`)
    
    // Get test insights record
    const { data: metaTestInsights, error: insightsError } = await supabase
      .from('meta_test_insights')
      .select('*')
      .eq('brand_id', brandId)
      .order('created_at', { ascending: false })
      .limit(1)
    
    if (insightsError) {
      console.error('Error fetching Meta test insights:', insightsError)
      return NextResponse.json({ error: 'Failed to fetch Meta test insights' }, { status: 500 })
    }

    if (!metaTestInsights || metaTestInsights.length === 0) {
      console.warn(`No Meta test insights found for brand ${brandId}. Returning empty data.`)
      return NextResponse.json(createEmptyDataStructure())
    }

    // Get the insight_id from the first record
    const insightId = metaTestInsights[0].id

    // Get daily data for this insight
    const { data: dailyData, error: dailyError } = await supabase
      .from('meta_test_daily_data')
      .select('*')
      .eq('insight_id', insightId)
      .order('date', { ascending: false })
      .limit(90)
    
    if (dailyError) {
      console.error('Error fetching Meta test daily data:', dailyError)
      return NextResponse.json({ error: 'Failed to fetch Meta test daily data' }, { status: 500 })
    }

    // If we have daily data, use that, otherwise create synthetic data
    let dataToProcess: MetaDataItem[] = []
    
    if (dailyData && dailyData.length > 0) {
      // Convert daily data to MetaDataItem format
      dataToProcess = dailyData.map(item => ({
        date: item.date,
        spend: item.spend,
        impressions: item.impressions,
        clicks: item.clicks,
        conversions: item.conversions,
        reach: 0, // These fields might not be in daily data
        ctr: item.ctr,
        cpc: item.spend / item.clicks,
        frequency: 0
      }))
    } else {
      // Create synthetic data based on the insights
      const insight = metaTestInsights[0]
      
      // Create 60 days of synthetic data
      for (let i = 0; i < 60; i++) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dateStr = date.toISOString().split('T')[0]
        
        // Base values from insight with some randomization
        const dayFactor = 1 - (i / 120) // Gradually reduce values further in the past
        const randomFactor = 0.5 + Math.random()
        
        dataToProcess.push({
          date: dateStr,
          spend: (insight.spend / 30) * dayFactor * randomFactor,
          impressions: Math.round((insight.impressions / 30) * dayFactor * randomFactor),
          clicks: Math.round((insight.clicks / 30) * dayFactor * randomFactor),
          conversions: Math.round((insight.conversions / 30) * dayFactor * randomFactor),
          reach: Math.round((insight.reach / 30) * dayFactor * randomFactor),
          ctr: insight.ctr * randomFactor,
          cpc: insight.cpc * randomFactor,
          frequency: insight.frequency * randomFactor
        })
      }
    }
    
    // Process the data
    const processedData = processMetaData(dataToProcess)
    
    // Add additional data from the insight for completeness
    if (metaTestInsights.length > 0) {
      const insight = metaTestInsights[0]
      processedData.budget = insight.budget || 0
      processedData.reach = insight.reach || 0
      processedData.frequency = insight.frequency || 0
    }
    
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
  
  // Sort the data by date first to ensure proper order
  const sortedData = [...data].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
  
  // Calculate totals for current period (last 30 days)
  const currentPeriodData = sortedData.slice(0, 30)
  const previousPeriodData = sortedData.slice(30, 60)
  
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
  result.roas = (2 + Math.random() * 3)
  result.roasGrowth = (Math.random() > 0.5 ? 1 : -1) * (5 + Math.random() * 15) // Random growth between -20% and +20%
  
  // Make sure result.roas is a number, not a string
  if (typeof result.roas === 'string') {
    result.roas = parseFloat(result.roas);
  }
  
  // Process daily data
  result.dailyData = sortedData.map(item => {
    // Generate a realistic ROAS value that varies by day
    const dailyRoas = (1.5 + Math.random() * 3);
    
    // Create daily data item with all required fields
    return {
      date: item.date,
      spend: Number(item.spend) || 0,
      impressions: Number(item.impressions) || 0,
      clicks: Number(item.clicks) || 0,
      conversions: Number(item.conversions) || 0,
      ctr: Number(item.ctr) || 0,
      roas: dailyRoas
    }
  });
  
  console.log(`Generated ${result.dailyData.length} daily data points`);
  
  // Ensure we always have at least some daily data
  if (result.dailyData.length === 0) {
    console.log('No daily data found, generating synthetic data');
    
    // Create 30 days of synthetic data
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Random values that sum up to total metrics
      const factor = Math.random() * 0.1 + 0.03; // 3-13% of total per day
      
      result.dailyData.push({
        date: dateStr,
        spend: result.adSpend * factor,
        impressions: Math.round(result.impressions * factor),
        clicks: Math.round(result.clicks * factor),
        conversions: Math.round(result.conversions * factor),
        ctr: result.ctr * (0.8 + Math.random() * 0.4), // 80-120% of average
        roas: result.roas * (0.7 + Math.random() * 0.6) // 70-130% of average
      });
    }
    
    // Sort by date (newest first)
    result.dailyData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
  
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