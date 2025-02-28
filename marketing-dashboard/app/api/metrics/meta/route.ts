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
    const startDate = url.searchParams.get('startDate')
    const endDate = url.searchParams.get('endDate')
    
    if (!brandId) {
      return NextResponse.json({ error: 'Missing brandId parameter' }, { status: 400 })
    }

    // Try to get data from the database
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    // For now, generate mock metrics
    const mockMetrics = {
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
      cprGrowth: -5.2,
      dailyData: generateDailyData(30)
    }

    return NextResponse.json(mockMetrics)
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

// Helper function to generate daily data for charts
function generateDailyData(days: number) {
  const data = []
  const today = new Date()
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    
    data.push({
      date: date.toISOString().split('T')[0],
      spend: Math.random() * 100 + 20,
      roas: Math.random() * 5 + 1,
      impressions: Math.floor(Math.random() * 10000),
      clicks: Math.floor(Math.random() * 500),
      conversions: Math.floor(Math.random() * 50)
    })
  }
  
  return data
} 