import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { fetchMetaAdInsights } from '@/lib/services/meta-service'

export const dynamic = 'force-dynamic'

/**
 * API endpoint to sync Meta ad insights data
 * This endpoint triggers a synchronization of ad insights from Meta API to the meta_ad_insights table
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Extract parameters from the request body
    const { brandId, startDate, endDate, forceRefresh = true } = await request.json()
    
    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }
    
    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Start and end dates are required' }, { status: 400 })
    }

    // Log the request
    console.log(`[Meta Insights] Syncing insights for brand ${brandId} from ${startDate} to ${endDate}`)
    
    // Parse dates
    const parsedStartDate = new Date(startDate)
    const parsedEndDate = new Date(endDate)
    
    // Validate the parsed dates
    if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD format.' }, { status: 400 })
    }
    
    // Call the service to fetch and store insights
    const result = await fetchMetaAdInsights(brandId, parsedStartDate, parsedEndDate, false)
    
    if (!result.success) {
      console.error('[Meta Insights] Sync failed:', result.error)
      return NextResponse.json({ 
        success: false, 
        error: result.error,
        details: result.details
      }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      message: result.message,
      count: result.count
    })
    
  } catch (error) {
    console.error('[Meta Insights] Error in sync endpoint:', error)
    return NextResponse.json({ 
      error: 'Server error', 
      details: typeof error === 'object' && error !== null && 'message' in error 
        ? (error.message as string) 
        : 'Unknown error'
    }, { status: 500 })
  }
} 