import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const url = new URL(request.url)
    const brandId = url.searchParams.get('brandId')
    const useMockData = url.searchParams.get('mock') === 'true'
    
    if (!brandId) {
      return NextResponse.json({ error: 'Missing brandId parameter' }, { status: 400 })
    }

    // If mock data is explicitly requested, return it
    if (useMockData) {
      return NextResponse.json(generateMockMetaData())
    }

    // Otherwise, try to get real data
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    // Get aggregated metrics from meta_data_tracking
    const { data, error } = await supabase
      .from('meta_data_tracking')
      .select('*')
      .eq('brand_id', brandId)
    
    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch Meta metrics' }, { status: 500 })
    }

    // If no data found, trigger a sync and return mock data for now
    if (!data || data.length === 0) {
      // Trigger a sync in the background
      fetch(`/api/meta/sync?brandId=${brandId}`, { method: 'POST' })
        .catch(err => console.error('Error triggering sync:', err))
      
      // Return mock data with a flag indicating it's mock
      const mockData = generateMockMetaData()
      mockData.isMockData = true
      return NextResponse.json(mockData)
    }

    // Process the real data
    const metrics = processMetaData(data)
    return NextResponse.json(metrics)
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

// Process real Meta data into the format expected by the frontend
function processMetaData(data) {
  // Calculate total metrics
  const totalSpend = data.reduce((sum, item) => sum + (parseFloat(item.spend) || 0), 0)
  const totalImpressions = data.reduce((sum, item) => sum + (parseInt(item.impressions) || 0), 0)
  const totalClicks = data.reduce((sum, item) => sum + (parseInt(item.clicks) || 0), 0)
  const totalConversions = data.reduce((sum, item) => sum + (parseInt(item.conversions) || 0), 0)
  
  // Calculate derived metrics
  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
  const cpa = totalConversions > 0 ? totalSpend / totalConversions : 0
  const roas = totalSpend > 0 ? (totalConversions * 50) / totalSpend : 0 // Assuming $50 value per conversion
  
  // Group data by date for daily trends
  const dailyData = []
  const dateMap = new Map()
  
  data.forEach(item => {
    const date = item.date_start
    if (!dateMap.has(date)) {
      dateMap.set(date, {
        date,
        spend: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0
      })
    }
    
    const dayData = dateMap.get(date)
    dayData.spend += parseFloat(item.spend) || 0
    dayData.impressions += parseInt(item.impressions) || 0
    dayData.clicks += parseInt(item.clicks) || 0
    dayData.conversions += parseInt(item.conversions) || 0
    
    // Calculate daily ROAS
    dayData.roas = dayData.spend > 0 ? (dayData.conversions * 50) / dayData.spend : 0
  })
  
  // Convert map to array and sort by date
  dateMap.forEach(value => dailyData.push(value))
  dailyData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  
  return {
    metrics: {
      adSpend: totalSpend,
      adSpendGrowth: calculateGrowth(dailyData, 'spend'),
      impressions: totalImpressions,
      impressionGrowth: calculateGrowth(dailyData, 'impressions'),
      clicks: totalClicks,
      clickGrowth: calculateGrowth(dailyData, 'clicks'),
      ctr: ctr,
      ctrGrowth: 0, // Would need historical data to calculate
      conversions: totalConversions,
      conversionGrowth: calculateGrowth(dailyData, 'conversions'),
      costPerResult: cpa,
      cprGrowth: 0, // Would need historical data to calculate
      roas: roas,
      roasGrowth: calculateGrowth(dailyData, 'roas')
    },
    dailyData
  }
}

// Calculate growth percentage between first and second half of the period
function calculateGrowth(dailyData, metric) {
  if (!dailyData || dailyData.length < 2) return 0
  
  const midpoint = Math.floor(dailyData.length / 2)
  
  const firstHalf = dailyData.slice(0, midpoint)
  const secondHalf = dailyData.slice(midpoint)
  
  const firstHalfSum = firstHalf.reduce((sum, day) => sum + (day[metric] || 0), 0)
  const secondHalfSum = secondHalf.reduce((sum, day) => sum + (day[metric] || 0), 0)
  
  if (firstHalfSum === 0) return secondHalfSum > 0 ? 100 : 0
  
  return ((secondHalfSum - firstHalfSum) / firstHalfSum) * 100
}

// Generate mock data (keep this for fallback)
function generateMockMetaData() {
  return {
    metrics: {
      adSpend: 1250.75,
      adSpendGrowth: 15.2,
      roas: 3.5,
      roasGrowth: 8.7,
      impressions: 185000,
      impressionGrowth: 22.3,
      ctr: 2.8,
      ctrGrowth: 0.5,
      clicks: 5180,
      clickGrowth: 12.4,
      conversions: 320,
      conversionGrowth: 18.9,
      costPerResult: 3.91,
      cprGrowth: -5.2
    },
    dailyData: generateMockDailyData()
  }
}

function generateMockDailyData() {
  const dailyData = []
  const today = new Date()
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    
    // Generate some random fluctuations
    const randomFactor = 0.5 + Math.random()
    
    dailyData.push({
      date: date.toISOString().split('T')[0],
      spend: Math.round(40 * randomFactor * 100) / 100,
      impressions: Math.round(6000 * randomFactor),
      clicks: Math.round(180 * randomFactor),
      conversions: Math.round(10 * randomFactor),
      roas: Math.round(3.5 * randomFactor * 10) / 10
    })
  }
  
  return dailyData
} 