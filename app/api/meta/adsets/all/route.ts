import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs'

interface DailyInsight {
  date: string;
  spent: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cost_per_conversion: number;
  reach?: number;
}

/**
 * API endpoint to get all ad sets across all campaigns for a brand
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

    console.log(`[API] Fetching all ad sets for brand ${brandId}, force refresh: ${forceRefresh}`)
    
    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )
    
    // First, fetch all campaigns for this brand
    const { data: campaigns, error: campaignsError } = await supabase
      .from('meta_campaigns')
      .select('campaign_id, campaign_name')
      .eq('brand_id', brandId)
    
    if (campaignsError) {
      console.error('[API] Error fetching campaigns:', campaignsError)
      return NextResponse.json(
        { error: 'Failed to fetch campaigns', details: campaignsError.message },
        { status: 500 }
      )
    }
    
    if (!campaigns || campaigns.length === 0) {
      console.log('[API] No campaigns found for this brand')
      return NextResponse.json(
        {
          success: true,
          source: 'database',
          timestamp: new Date().toISOString(),
          adSets: []
        },
        { status: 200 }
      )
    }
    
    console.log(`[API] Found ${campaigns.length} campaigns for brand ${brandId}`)
    
    // Now fetch all ad sets for these campaigns
    let allAdSets: any[] = []
    
    // Use a query that joins meta_ad_sets with meta_campaigns
    const { data: adSets, error: adSetsError } = await supabase
      .from('meta_ad_sets')
      .select('*, meta_campaigns!inner(campaign_name)')
      .eq('brand_id', brandId)
      .order('updated_at', { ascending: false })
    
    if (adSetsError) {
      console.error('[API] Error fetching ad sets:', adSetsError)
      return NextResponse.json(
        { error: 'Failed to fetch ad sets', details: adSetsError.message },
        { status: 500 }
      )
    }
    
    if (adSets && adSets.length > 0) {
      console.log(`[API] Found ${adSets.length} ad sets in the database`)
      allAdSets = adSets
      
      // If date range is provided and we have ad sets, filter by date range
      if (hasDateRange && allAdSets.length > 0) {
        const from = new Date(fromDate!)
        const to = new Date(toDate!)
        
        // Filter daily insights by date range for each ad set
        allAdSets = allAdSets.map(adSet => {
          if (adSet.daily_insights && adSet.daily_insights.length > 0) {
            const filteredInsights = adSet.daily_insights.filter((insight: DailyInsight) => {
              const insightDate = new Date(insight.date)
              return insightDate >= from && insightDate <= to
            })
            
            // Calculate metrics based on filtered insights
            const spent = filteredInsights.reduce((sum: number, insight: DailyInsight) => sum + insight.spent, 0)
            const impressions = filteredInsights.reduce((sum: number, insight: DailyInsight) => sum + insight.impressions, 0)
            const clicks = filteredInsights.reduce((sum: number, insight: DailyInsight) => sum + insight.clicks, 0)
            const conversions = filteredInsights.reduce((sum: number, insight: DailyInsight) => sum + insight.conversions, 0)
            const reach = filteredInsights.reduce((sum: number, insight: DailyInsight) => sum + (insight.reach || 0), 0)
            const ctr = impressions > 0 ? clicks / impressions : 0
            const cpc = clicks > 0 ? spent / clicks : 0
            const costPerConversion = conversions > 0 ? spent / conversions : 0
            
            return {
              ...adSet,
              spent,
              impressions,
              clicks,
              conversions,
              reach,
              ctr,
              cpc,
              cost_per_conversion: costPerConversion,
              daily_insights: filteredInsights
            }
          }
          
          return adSet
        })
      }
    }
    
    // Calculate total raw reach (sum of individual ad sets)
    const totalRawReach = allAdSets.reduce((sum, adSet) => sum + (Number(adSet.reach) || 0), 0)
    console.log(`[API] Total RAW reach across all ad sets: ${totalRawReach}`)
    
    return NextResponse.json(
      {
        success: true,
        source: forceRefresh ? 'meta_api' : 'database',
        timestamp: new Date().toISOString(),
        adSets: allAdSets,
        totalReach: totalRawReach
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Error in all ad sets endpoint:', error)
    return NextResponse.json(
      { error: 'Failed to fetch all ad sets', details: error.message },
      { status: 500 }
    )
  }
} 