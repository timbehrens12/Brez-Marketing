import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'
import { fetchMetaAdSets } from '@/lib/services/meta-service'

export const dynamic = 'force-dynamic'

// Define types for insights and ad sets
interface DailyInsight {
  date: string;
  spent: number;
  impressions: number;
  clicks: number;
  conversions: number;
  reach?: number;
  ctr: number;
  cpc: number;
  cost_per_conversion: number;
}

interface AdSetFromMeta {
  adset_id: string;
  adset_name: string;
  campaign_id: string;
  status: string;
  budget: number;
  budget_type: string;
  optimization_goal: string | null;
  bid_strategy: string | null;
  bid_amount: number;
  targeting: any | null;
  start_date: string | null;
  end_date: string | null;
  spent: number;
  impressions: number;
  clicks: number;
  reach: number;
  ctr: number;
  cpc: number;
  conversions: number;
  cost_per_conversion: number;
  daily_insights: DailyInsight[];
}

interface AdSetFromDB {
  id: string;
  brand_id: string;
  adset_id: string;
  adset_name: string;
  campaign_id: string;
  status: string;
  budget: number;
  budget_type: string;
  spent: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cost_per_conversion: number;
  daily_insights?: DailyInsight[];
  [key: string]: any; // For any other properties
}

// Union type to handle both Meta API and DB responses
type AdSet = AdSetFromMeta | AdSetFromDB;

/**
 * API endpoint to get ad sets for a specific campaign
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
    const campaignId = searchParams.get('campaignId')
    const forceRefresh = searchParams.get('forceRefresh') === 'true'
    
    // Get date range parameters if provided
    const fromDate = searchParams.get('from')
    const toDate = searchParams.get('to')
    const hasDateRange = fromDate && toDate
    
    if (!brandId || !campaignId) {
      return NextResponse.json(
        { error: 'Brand ID and Campaign ID are required' },
        { status: 400 }
      )
    }

    console.log(`[API] Fetching ad sets for brand ${brandId} and campaign ${campaignId}, force refresh: ${forceRefresh}`)
    
    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )
    
    // Fetch from database first, unless forceRefresh is true
    if (!forceRefresh) {
      let adSets: AdSet[] | null = null
      
      // If date range is provided, use the get_adset_insights_by_date_range function
      if (hasDateRange) {
        const { data, error } = await supabase.rpc(
          'get_adset_insights_by_date_range',
          {
            brand_uuid: brandId,
            p_from_date: fromDate,
            p_to_date: toDate
          }
        )
        
        if (error) {
          console.error('Error fetching ad sets by date range:', error)
        } else if (data && data.length > 0) {
          adSets = data as AdSet[]
          return NextResponse.json(
            {
              success: true,
              source: 'database_date_range',
              timestamp: new Date().toISOString(),
              adSets
            },
            { status: 200 }
          )
        }
      } else {
        // Regular fetch without date range
        const { data, error } = await supabase
          .from('meta_adsets')
          .select('*')
          .eq('brand_id', brandId)
          .eq('campaign_id', campaignId)
        
        if (error) {
          console.error('Error fetching ad sets from database:', error)
        } else if (data && data.length > 0) {
          adSets = data as AdSet[]
          return NextResponse.json(
            {
              success: true,
              source: 'database',
              timestamp: new Date().toISOString(),
              adSets
            },
            { status: 200 }
          )
        }
      }
    }
    
    // If we reach here, either forceRefresh is true or no data was found in the database
    // Fetch fresh data from Meta API
    console.log('Fetching ad sets from Meta API...')
    const result = await fetchMetaAdSets(brandId, campaignId, true)
    
    if (result.success && result.adSets) {
      let filteredAdSets = result.adSets as AdSetFromMeta[]
      
      // If date range is provided, filter by date range
      if (hasDateRange && filteredAdSets.length > 0) {
        const from = new Date(fromDate!)
        const to = new Date(toDate!)
        
        // Filter daily insights by date range for each ad set
        filteredAdSets = filteredAdSets.map(adSet => {
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
            const ctr = impressions > 0 ? clicks / impressions : 0
            const cpc = clicks > 0 ? spent / clicks : 0
            const costPerConversion = conversions > 0 ? spent / conversions : 0
            
            return {
              ...adSet,
              spent,
              impressions,
              clicks,
              conversions,
              ctr,
              cpc,
              cost_per_conversion: costPerConversion,
              daily_insights: filteredInsights
            }
          }
          
          return adSet
        })
      }
      
      return NextResponse.json(
        {
          success: true,
          source: 'meta_api',
          timestamp: new Date().toISOString(),
          adSets: filteredAdSets
        },
        { status: 200 }
      )
    } else {
      return NextResponse.json(
        {
          error: 'Failed to fetch ad sets from Meta API',
          details: result.error
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Error in ad sets endpoint:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ad sets', details: error.message },
      { status: 500 }
    )
  }
} 