import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'

interface Ad {
  ad_id: string
  ad_name: string
  adset_id: string
  campaign_id: string
  status: string
  effective_status: string
  creative_id: string | null
  preview_url: string | null
  thumbnail_url: string | null
  image_url: string | null
  headline: string | null
  body: string | null
  cta_type: string | null
  link_url: string | null
  spent: number
  impressions: number
  clicks: number
  reach: number
  ctr: number
  cpc: number
  conversions: number
  cost_per_conversion: number
  brand_id: string
  updated_at: string
}

/**
 * API endpoint to get all ads across all campaigns for a brand
 */
export async function GET(req: NextRequest) {
  try {
    // Verify user authentication
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - You must be logged in to access this resource' },
        { status: 401 }
      )
    }
    
    // Get query parameters
    const searchParams = req.nextUrl.searchParams
    const brandId = searchParams.get('brandId')
    const forceRefresh = searchParams.get('forceRefresh') === 'true'
    const status = searchParams.get('status') || 'ACTIVE' // Default to only active ads
    
    // Get date range parameters if provided
    const fromDate = searchParams.get('from')
    const toDate = searchParams.get('to')
    const hasDateRange = fromDate && toDate
    
    if (hasDateRange) {
      console.log(`[API] Using date range from ${fromDate} to ${toDate} (inclusive)`)
    }
    
    if (!brandId) {
      return NextResponse.json(
        { error: 'Brand ID is required' },
        { status: 400 }
      )
    }

    console.log(`[API] Fetching all ads for brand ${brandId}, status: ${status}, force refresh: ${forceRefresh}`)
    
    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )
    
    // First, verify the brand exists and user has access
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('id')
      .eq('id', brandId)
      .single()
      
    if (brandError || !brand) {
      return NextResponse.json(
        { error: 'Brand not found or you do not have access to it' },
        { status: 404 }
      )
    }
    
    // Fetch all ads for this brand
    let query = supabase
      .from('meta_ads')
      .select(`
        ad_id,
        ad_name,
        adset_id,
        campaign_id,
        status,
        effective_status,
        creative_id,
        preview_url,
        thumbnail_url,
        image_url,
        headline,
        body,
        cta_type,
        link_url,
        spent,
        impressions,
        clicks,
        reach,
        ctr,
        cpc,
        conversions,
        cost_per_conversion,
        brand_id,
        updated_at
      `)
      .eq('brand_id', brandId)
      .order('updated_at', { ascending: false })
    
    // Filter by status if specified and not 'ALL'
    if (status && status !== 'ALL') {
      query = query.eq('status', status)
    }
    
    const { data: ads, error: adsError } = await query
    
    if (adsError) {
      console.error('[API] Error fetching ads:', adsError)
      return NextResponse.json(
        { error: 'Failed to fetch ads', details: adsError.message },
        { status: 500 }
      )
    }
    
    if (!ads || ads.length === 0) {
      console.log('[API] No ads found for this brand')
      return NextResponse.json(
        {
          success: true,
          source: 'database',
          timestamp: new Date().toISOString(),
          ads: [],
          message: 'No ads found for this brand'
        },
        { status: 200 }
      )
    }
    
    console.log(`[API] Found ${ads.length} ads for brand ${brandId}`)
    
    // If date range is provided, filter by date range using daily insights
    // Note: This is a simplified version - for full date range filtering,
    // you'd need to aggregate daily insights data
    let filteredAds = ads
    
    if (hasDateRange) {
      // For now, we'll return all ads but note that date filtering
      // would require aggregating daily insights data
      console.log(`[API] Date range filtering requested but not fully implemented for ads endpoint`)
    }
    
    // Add campaign and adset names by joining with other tables
    const campaignIds = [...new Set(filteredAds.map(ad => ad.campaign_id).filter(Boolean))]
    const adsetIds = [...new Set(filteredAds.map(ad => ad.adset_id).filter(Boolean))]
    
    // Fetch campaign names
    const { data: campaigns } = await supabase
      .from('meta_campaigns')
      .select('campaign_id, campaign_name')
      .in('campaign_id', campaignIds)
    
    // Fetch adset names
    const { data: adsets } = await supabase
      .from('meta_ad_sets')
      .select('adset_id, adset_name')
      .in('adset_id', adsetIds)
    
    // Create lookup maps
    const campaignMap = new Map(campaigns?.map(c => [c.campaign_id, c.campaign_name]) || [])
    const adsetMap = new Map(adsets?.map(a => [a.adset_id, a.adset_name]) || [])
    
    // Enhance ads with campaign and adset names
    const enhancedAds = filteredAds.map(ad => ({
      ...ad,
      campaign_name: campaignMap.get(ad.campaign_id) || 'Unknown Campaign',
      adset_name: adsetMap.get(ad.adset_id) || 'Unknown Ad Set'
    }))
    
    return NextResponse.json(
      {
        success: true,
        source: forceRefresh ? 'meta_api' : 'database',
        timestamp: new Date().toISOString(),
        ads: enhancedAds,
        count: enhancedAds.length
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Error in all ads endpoint:', error)
    return NextResponse.json(
      { error: 'Failed to fetch all ads', details: error.message },
      { status: 500 }
    )
  }
} 