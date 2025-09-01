import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { fetchMetaAds } from '@/lib/services/meta-service'
import { auth } from '@clerk/nextjs'

export const dynamic = 'force-dynamic'

// Define type for Meta ads
interface MetaAd {
  ad_id: string;
  ad_name: string;
  adset_id: string;
  campaign_id: string;
  status: string;
  effective_status: string;
  creative_id: string | null;
  preview_url: string | null;
  thumbnail_url: string | null;
  image_url: string | null;
  headline: string | null;
  body: string | null;
  cta_type: string | null;
  link_url: string | null;
  spent: number;
  impressions: number;
  clicks: number;
  reach: number;
  ctr: number;
  cpc: number;
  conversions: number;
  cost_per_conversion: number;
  daily_insights?: any[];
  [key: string]: any; // For any additional properties
}

export async function GET(request: NextRequest) {
  try {
    // Verify user authentication
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const brandId = searchParams.get('brandId')
    const adsetId = searchParams.get('adsetId')
    const forceRefresh = searchParams.get('forceRefresh') === 'true'
    
    // Get date range if provided
    const fromDate = searchParams.get('from')
    const toDate = searchParams.get('to')
    
    if (!brandId || !adsetId) {
      return NextResponse.json(
        { error: 'Brand ID and Ad Set ID are required parameters' }, 
        { status: 400 }
      )
    }
    
    // Create Supabase client
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )
    
    // Check if user has access to this brand
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
    
    let ads: MetaAd[] = []
    const timestamp = new Date()
    
    // If force refresh is true or no date range provided, fetch from Meta API
    if (forceRefresh) {
      console.log(`Fetching ads for ad set ${adsetId} from Meta API (force refresh)`)
      const result = await fetchMetaAds(
        brandId, 
        adsetId, 
        true,
        fromDate && toDate ? { from: fromDate, to: toDate } : undefined
      )
      
      if (!result.success) {
        return NextResponse.json(
          { error: result.error || 'Failed to fetch ads from Meta API' }, 
          { status: 500 }
        )
      }
      
      ads = result.ads || []
    } else {
      // Try to get ads from database with date filtering if provided
      if (fromDate && toDate) {
        console.log(`Fetching ads for ad set ${adsetId} from database with date range ${fromDate} to ${toDate}`)
        
        // Use the get_ad_insights_by_date_range database function for date-filtered data
        const { data, error } = await supabase.rpc('get_ad_insights_by_date_range', {
          brand_uuid: brandId,
          p_from_date: fromDate,
          p_to_date: toDate,
          p_adset_id: adsetId
        })
        
        if (error) {
          console.error('Error fetching ads from database:', error)
          
          // Pass date range to fetchMetaAds if available
          const result = await fetchMetaAds(
            brandId, 
            adsetId, 
            true,
            fromDate && toDate ? { from: fromDate, to: toDate } : undefined
          )
          
          if (!result.success) {
            return NextResponse.json(
              { error: 'Failed to fetch ads from both database and Meta API' }, 
              { status: 500 }
            )
          }
          
          ads = result.ads || []
        } else {
          ads = data || []
        }
      } else {
        // If no date range, get the most recent data from the database
        console.log(`Fetching ads for ad set ${adsetId} from database without date filtering`)
        
        const { data, error } = await supabase
          .from('meta_ads')
          .select('*')
          .eq('brand_id', brandId)
          .eq('adset_id', adsetId)
        
        if (error || !data || data.length === 0) {
          console.log('No ads found in database, fetching from Meta API')
          
          // If no data in DB, fetch from Meta API
          const result = await fetchMetaAds(
            brandId, 
            adsetId, 
            true,
            fromDate && toDate ? { from: fromDate, to: toDate } : undefined
          )
          
          if (!result.success) {
            return NextResponse.json(
              { error: 'Failed to fetch ads' }, 
              { status: 500 }
            )
          }
          
          ads = result.ads || []
        } else {
          ads = data
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      ads,
      count: ads.length,
      timestamp,
      source: forceRefresh ? 'meta_api' : 'database'
    })
  } catch (error) {
    console.error('Error in /api/meta/ads:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' }, 
      { status: 500 }
    )
  }
}

// API route to refresh all ads for a specific ad set
export async function POST(request: NextRequest) {
  try {
    // Verify user authentication
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { brandId, adsetId } = body
    
    if (!brandId || !adsetId) {
      return NextResponse.json(
        { error: 'Brand ID and Ad Set ID are required' }, 
        { status: 400 }
      )
    }
    
    // Create Supabase client
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )
    
    // Check if user has access to this brand
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
    
    // Force fetch ads from Meta API
    const result = await fetchMetaAds(brandId, adsetId, true)
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to refresh ads from Meta API' }, 
        { status: 500 }
      )
    }
    
    const adCount = result.ads?.length || 0
    
    return NextResponse.json({
      success: true,
      message: `Successfully refreshed ads for ad set ${adsetId}`,
      count: adCount
    })
  } catch (error) {
    console.error('Error in POST /api/meta/ads:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' }, 
      { status: 500 }
    )
  }
} 