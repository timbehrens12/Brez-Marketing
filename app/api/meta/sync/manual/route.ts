import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { fetchMetaAdInsights } from '@/lib/services/meta-service'

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { brandId, startDate, endDate } = await request.json()
    
    if (!brandId || !startDate || !endDate) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    const result = await fetchMetaAdInsights(brandId, startDate, endDate)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in manual sync endpoint:', error)
    return NextResponse.json({ 
      error: 'Server error', 
      details: typeof error === 'object' && error !== null && 'message' in error 
        ? (error.message as string) 
        : 'Unknown error'
    }, { status: 500 })
  }
} 