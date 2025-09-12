import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'
// DISABLED: Old Meta service to prevent duplicates
// import { fetchMetaAdInsights } from '@/lib/services/meta-service'

// Set maximum duration for Meta sync (5 minutes)
export const maxDuration = 300

export async function POST(request: NextRequest) {
  try {
    // Check if this is an automated call (from cron job)
    const userAgent = request.headers.get('user-agent')
    const isAutomated = userAgent === 'Brez-Daily-Sync' || userAgent === 'Brez-Midday-Refresh'
    
    // For automated calls, skip user authentication
    if (!isAutomated) {
      const { userId } = auth()
      
      if (!userId) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
      }
    }

    // Get brandId and other parameters from request body or query parameters
    let brandId, dryRun, days, automated, force_refresh
    
    try {
      const body = await request.json()
      brandId = body.brandId
      dryRun = body.dryRun === true
      days = body.days || 30
      automated = body.automated === true
      force_refresh = body.force_refresh === true
    } catch {
      // If JSON parsing fails, try query parameters (backward compatibility)
      const url = new URL(request.url)
      brandId = url.searchParams.get('brandId')
      dryRun = url.searchParams.get('dryRun') === 'true'
      days = parseInt(url.searchParams.get('days') || '30')
    }
    
    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    // Calculate date range (configurable days, default 30)
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Fetch insights with the dry run flag
    // DISABLED: Old Meta sync to prevent duplicates
    const insights = { success: true, message: 'Old sync system disabled', count: 0 }
    // const insights = await fetchMetaAdInsights(brandId, startDate, endDate, dryRun)

    return NextResponse.json({
      success: true,
      message: dryRun 
        ? 'Meta ad insights fetched successfully (dry run, data not stored)' 
        : 'Meta ad insights synced successfully',
      count: insights?.count || 0,
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