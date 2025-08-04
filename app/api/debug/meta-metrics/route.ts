import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'

export async function GET(request: NextRequest) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Return the mock metrics directly for debugging
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
      cprGrowth: -5.2
    }

    return NextResponse.json({
      success: true,
      metrics: mockMetrics,
      message: 'Debug metrics returned successfully'
    })
  } catch (error) {
    console.error('Error in debug endpoint:', error)
    return NextResponse.json({ 
      error: 'Server error', 
      details: typeof error === 'object' && error !== null && 'message' in error 
        ? (error.message as string) 
        : 'Unknown error'
    }, { status: 500 })
  }
} 