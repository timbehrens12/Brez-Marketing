import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'
import { fetchMetaAdInsights } from '@/lib/services/meta-service'

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get brandId and dryRun parameter from query parameters
    const url = new URL(request.url)
    const brandId = url.searchParams.get('brandId')
    const dryRun = url.searchParams.get('dryRun') === 'true'
    
    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    // Calculate date range (last 30 days)
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 30)

    // Fetch insights with the dry run flag
    const insights = await fetchMetaAdInsights(brandId, startDate, endDate, dryRun)

    return NextResponse.json({
      success: true,
      message: dryRun 
        ? 'Meta ad insights fetched successfully (dry run, data not stored)' 
        : 'Meta ad insights synced successfully',
      data: dryRun ? insights : undefined
    })
  } catch (error) {
    console.error('Error syncing Meta ads:', error)
    return NextResponse.json({ 
      error: 'Failed to sync Meta ads', 
      details: typeof error === 'object' && error !== null && 'message' in error 
        ? (error.message as string) 
        : 'Unknown error' 
    }, { status: 500 })
  }
} 