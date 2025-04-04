import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'
import { fetchMetaAdInsights } from '@/lib/services/meta-service'

export const dynamic = 'force-dynamic'

/**
 * API endpoint to resynchronize Meta data from scratch
 * This endpoint will clear the meta_ad_insights table for the brand
 * and then refetch all insights from Meta API
 */
export async function POST(request: NextRequest) {
  try {
    // Verify user authentication
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - You must be logged in to access this resource' },
        { status: 401 }
      )
    }
    
    // Get parameters from both URL and request body
    const searchParams = request.nextUrl.searchParams
    const paramBrandId = searchParams.get('brandId')
    
    // Get body content if present
    let bodyParams = {}
    try {
      bodyParams = await request.json()
    } catch (e) {
      // No body provided or invalid JSON, continue with URL params
      console.log('[Meta Resync] No valid JSON body provided, using URL params only')
    }
    
    // Combine parameters, prioritizing body params
    const brandId = (bodyParams as any).brandId || paramBrandId
    const days = (bodyParams as any).days || 90 // Default to 90 days
    const forceRefresh = (bodyParams as any).force_refresh || true
    
    if (!brandId) {
      return NextResponse.json(
        { error: 'Brand ID is required' },
        { status: 400 }
      )
    }
    
    console.log(`[Meta Resync] Starting complete resync for brand: ${brandId}, days: ${days}, force_refresh: ${forceRefresh}`)
    
    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // 1. Get the active Meta connection for this brand
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')
      .eq('status', 'active')
      .single()
    
    if (connectionError || !connection) {
      console.error('[Meta Resync] Failed to get Meta connection:', connectionError)
      return NextResponse.json({ 
        error: 'No active Meta connection found for this brand' 
      }, { status: 404 })
    }
    
    // 2. Delete existing meta_ad_insights for this brand
    console.log(`[Meta Resync] Clearing existing Meta insights for brand: ${brandId}`)
    const { error: deleteError } = await supabase
      .from('meta_ad_insights')
      .delete()
      .eq('brand_id', brandId)
    
    if (deleteError) {
      console.error('[Meta Resync] Error deleting existing Meta insights:', deleteError)
      return NextResponse.json({
        error: 'Failed to clean existing data',
        details: deleteError.message
      }, { status: 500 })
    }
    
    // 3. Calculate date range (last N days)
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(endDate.getDate() - days)
    
    console.log(`[Meta Resync] Fetching Meta data from ${startDate.toISOString()} to ${endDate.toISOString()}`)
    
    // 4. Fetch and save new data
    const result = await fetchMetaAdInsights(brandId, startDate, endDate, false)
    
    if (result.success) {
      // 5. Also refresh campaigns and ad sets
      console.log(`[Meta Resync] Successfully refreshed insights, now syncing campaigns...`)
      
      // Construct full URLs for internal requests
      const baseUrl = process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}` 
        : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      
      // Synchronize campaigns
      try {
        const campaignResponse = await fetch(`${baseUrl}/api/meta/campaigns/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.API_SECRET_KEY || 'internal-call'}`
          },
          body: JSON.stringify({
            brandId,
            forceRefresh: true
          })
        })
        
        if (!campaignResponse.ok) {
          console.warn('[Meta Resync] Warning: Failed to sync campaigns:', await campaignResponse.text())
        } else {
          console.log('[Meta Resync] Successfully synced campaigns')
        }
      } catch (error) {
        console.error('[Meta Resync] Error syncing campaigns:', error)
        // Continue despite error
      }
      
      // Refresh ad sets
      try {
        const adsetsResponse = await fetch(`${baseUrl}/api/meta/adsets/refresh-all?brandId=${brandId}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.API_SECRET_KEY || 'internal-call'}`
          }
        })
        
        if (!adsetsResponse.ok) {
          console.warn('[Meta Resync] Warning: Failed to refresh adsets:', await adsetsResponse.text())
        } else {
          console.log('[Meta Resync] Successfully refreshed ad sets')
        }
      } catch (error) {
        console.error('[Meta Resync] Error refreshing ad sets:', error)
        // Continue despite error
      }
      
      return NextResponse.json({
        success: true,
        message: 'Successfully resynchronized Meta data',
        insights: result.count || 0,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        days
      })
    } else {
      console.error('[Meta Resync] Failed to fetch insights:', result.error)
      return NextResponse.json({
        error: 'Failed to fetch new Meta insights',
        details: result.error
      }, { status: 500 })
    }
  } catch (error: any) {
    console.error('[Meta Resync] Error:', error)
    
    return NextResponse.json({
      error: 'Failed to resynchronize Meta data',
      details: error.message
    }, { status: 500 })
  }
} 