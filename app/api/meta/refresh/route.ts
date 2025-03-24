import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { refreshMetaData } from '@/lib/services/meta-service'

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get query parameters
    const url = new URL(request.url)
    const brandId = url.searchParams.get('brandId')
    
    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    // Get optional date range parameters
    const fromDateParam = url.searchParams.get('from')
    const toDateParam = url.searchParams.get('to')
    
    // Convert string dates to Date objects if provided
    const fromDate = fromDateParam ? new Date(fromDateParam) : undefined
    const toDate = toDateParam ? new Date(toDateParam) : undefined
    
    // Validate dates if provided
    if (fromDateParam && isNaN(fromDate?.getTime() || 0)) {
      return NextResponse.json({ error: 'Invalid from date' }, { status: 400 })
    }
    
    if (toDateParam && isNaN(toDate?.getTime() || 0)) {
      return NextResponse.json({ error: 'Invalid to date' }, { status: 400 })
    }
    
    // Refresh Meta data
    const result = await refreshMetaData(brandId, fromDate, toDate)
    
    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      count: result.count,
      dateRange: {
        from: fromDate?.toISOString() || 'last 30 days',
        to: toDate?.toISOString() || 'today'
      }
    })
  } catch (error) {
    console.error('Error refreshing Meta data:', error)
    return NextResponse.json({ 
      error: 'Server error', 
      details: typeof error === 'object' && error !== null && 'message' in error 
        ? (error.message as string) 
        : 'Unknown error'
    }, { status: 500 })
  }
} 