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
    
    // Ensure the date range is inclusive and properly bounded
    // Note: API should respect the exact dates from the client and not modify them
    if (hasDateRange) {
      console.log(`[API] Using date range from ${fromDate} to ${toDate} (inclusive)`);
    }
    
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
        try {
          console.log(`Attempting to fetch ad sets with date range from ${fromDate} to ${toDate}`);
          
          // We'll try a different approach since get_adset_insights_by_date_range is causing type issues
          // First, fetch the basic ad set data
          const { data: adSetsData, error: adSetsError } = await supabase
            .from('meta_adsets')
            .select('*')
            .eq('brand_id', brandId)
            .eq('campaign_id', campaignId);
          
          if (adSetsError) {
            console.error('Error fetching basic ad sets data:', adSetsError);
            throw adSetsError;
          }
          
          if (adSetsData && adSetsData.length > 0) {
            // Now fetch insights separately for each ad set
            const adSetIds = adSetsData.map(adSet => adSet.adset_id);
            
            const { data: insightsData, error: insightsError } = await supabase
              .from('meta_adset_daily_insights')
              .select('*')
              .in('adset_id', adSetIds)
              .gte('date', fromDate!)
              .lte('date', toDate!);
            
            if (insightsError) {
              console.error('Error fetching ad set insights:', insightsError);
              throw insightsError;
            }
            
            // Group insights by ad set
            const insightsByAdSet: Record<string, DailyInsight[]> = {};
            
            if (insightsData && insightsData.length > 0) {
              insightsData.forEach(insight => {
                if (!insightsByAdSet[insight.adset_id]) {
                  insightsByAdSet[insight.adset_id] = [];
                }
                
                insightsByAdSet[insight.adset_id].push({
                  date: insight.date,
                  spent: Number(insight.spent || 0),
                  impressions: Number(insight.impressions || 0),
                  clicks: Number(insight.clicks || 0),
                  conversions: Number(insight.conversions || 0),
                  reach: Number(insight.reach || 0),
                  ctr: Number(insight.ctr || 0),
                  cpc: Number(insight.cpc || 0),
                  cost_per_conversion: Number(insight.cost_per_conversion || 0)
                });
              });
            }
            
            // Combine ad sets with their insights and calculate metrics
            adSets = adSetsData.map(adSet => {
              const insights = insightsByAdSet[adSet.adset_id] || [];
              
              // Calculate aggregated metrics from insights
              const spent = insights.reduce((sum, insight) => sum + Number(insight.spent || 0), 0);
              const impressions = insights.reduce((sum, insight) => sum + Number(insight.impressions || 0), 0);
              const clicks = insights.reduce((sum, insight) => sum + Number(insight.clicks || 0), 0);
              const conversions = insights.reduce((sum, insight) => sum + Number(insight.conversions || 0), 0);
              const reach = insights.reduce((sum, insight) => sum + Number(insight.reach || 0), 0);
              
              // Calculate derived metrics
              const ctr = impressions > 0 ? clicks / impressions : 0;
              const cpc = clicks > 0 ? spent / clicks : 0;
              const cost_per_conversion = conversions > 0 ? spent / conversions : 0;
              
              return {
                ...adSet,
                spent: Number(spent),
                impressions: Number(impressions),
                clicks: Number(clicks),
                conversions: Number(conversions),
                reach: Number(reach),
                ctr: Number(ctr),
                cpc: Number(cpc),
                cost_per_conversion: Number(cost_per_conversion),
                daily_insights: insights,
                // Ensure all numeric fields are proper JavaScript numbers
                budget: Number(adSet.budget),
                bid_amount: adSet.bid_amount ? Number(adSet.bid_amount) : 0
              };
            });
            
            console.log(`Successfully processed ${adSets.length} ad sets with insights for date range`);
            
            return NextResponse.json(
              {
                success: true,
                source: 'database_manual_join',
                timestamp: new Date().toISOString(),
                adSets
              },
              { status: 200 }
            );
          }
        } catch (dbError) {
          console.error('Exception when processing ad sets with date range:', dbError);
          // Continue to fallback methods, don't throw the error
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
    console.log('[API] Fetching ad sets from Meta API...')
    
    // Parse dates if they exist
    let startDate: Date | undefined = undefined;
    let endDate: Date | undefined = undefined;
    if (hasDateRange) {
      try {
        startDate = new Date(fromDate!)
        endDate = new Date(toDate!)
        console.log(`[API] Parsed date range for Meta API call: ${startDate.toISOString()} to ${endDate.toISOString()}`);
      } catch (dateError) {
        console.error("[API] Error parsing date range parameters:", dateError);
        // Optionally return an error or proceed without dates
        return NextResponse.json({ error: 'Invalid date format provided' }, { status: 400 });
      }
    }
    
    const result = await fetchMetaAdSets(
      brandId, 
      campaignId, 
      true, 
      startDate, // Pass optional startDate
      endDate // Pass optional endDate
    )
    
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