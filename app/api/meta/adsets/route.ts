import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'
import { fetchMetaAdSets } from '@/lib/services/meta-service'
import { withMetaRateLimit } from '@/lib/services/meta-rate-limiter'

export const dynamic = 'force-dynamic'

// Simple in-memory rate limiting
const RATE_LIMIT_WINDOW = 5 * 60 * 1000; // 5 minute window to be conservative
const requestLog: {timestamp: number; accountId?: string}[] = [];

// Helper to check if we're rate limited
function isRateLimited(accountId?: string) {
  const now = Date.now();
  // Clean up old requests
  const windowStart = now - RATE_LIMIT_WINDOW;
  
  // Remove expired timestamps
  while (requestLog.length > 0 && requestLog[0].timestamp < windowStart) {
    requestLog.shift();
  }
  
  return false; // We'll only use the Meta API response to determine rate limiting
}

// Log a request for rate limiting
function logRequest(accountId?: string) {
  requestLog.push({
    timestamp: Date.now(),
    accountId
  });
}

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
    
    // Always check for cached data first, even with forceRefresh
    // This ensures we have a fallback in case of rate limiting
    let cachedAdSets: AdSet[] | null = null;
      
    // If date range is provided, use a different query
      if (hasDateRange) {
        try {
        console.log(`[API] Attempting to fetch cached ad sets with date range from ${fromDate} to ${toDate}`);
          
          // First, fetch the basic ad set data
          const { data: adSetsData, error: adSetsError } = await supabase
            .from('meta_adsets')
            .select('*')
            .eq('brand_id', brandId)
            .eq('campaign_id', campaignId);
          
          if (adSetsError) {
          console.error('[API] Error fetching basic ad sets data:', adSetsError);
        } else if (adSetsData && adSetsData.length > 0) {
            // Now fetch insights separately for each ad set
            const adSetIds = adSetsData.map(adSet => adSet.adset_id);
            
            const { data: insightsData, error: insightsError } = await supabase
              .from('meta_adset_daily_insights')
              .select('*')
              .in('adset_id', adSetIds)
              .gte('date', fromDate!)
              .lte('date', toDate!);
            
            if (insightsError) {
            console.error('[API] Error fetching ad set insights:', insightsError);
          } else {
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
            cachedAdSets = adSetsData.map(adSet => {
              const insights = insightsByAdSet[adSet.adset_id] || [];
              
              // Calculate combined metrics (DO NOT SUM DAILY REACH)
              const spent = insights.reduce((sum, insight) => sum + Number(insight.spent || 0), 0);
              const impressions = insights.reduce((sum, insight) => sum + Number(insight.impressions || 0), 0);
              const clicks = insights.reduce((sum, insight) => sum + Number(insight.clicks || 0), 0);
              const conversions = insights.reduce((sum, insight) => sum + Number(insight.conversions || 0), 0);
              
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
                reach: Number(adSet.reach || 0), // Use reach from the main adSet record
                ctr: Number(ctr),
                cpc: Number(cpc),
                cost_per_conversion: Number(cost_per_conversion),
                daily_insights: insights,
                // Ensure all numeric fields are proper JavaScript numbers
                budget: Number(adSet.budget),
                bid_amount: adSet.bid_amount ? Number(adSet.bid_amount) : 0
              };
            });
            
            console.log(`[API] Successfully processed ${cachedAdSets.length} cached ad sets with insights for date range`);
            }
          }
        } catch (dbError) {
        console.error('[API] Exception when processing cached ad sets with date range:', dbError);
          // Continue to fallback methods, don't throw the error
        }
      } else {
        // Regular fetch without date range
        const { data, error } = await supabase
          .from('meta_adsets')
          .select('*')
          .eq('brand_id', brandId)
        .eq('campaign_id', campaignId);
        
        if (error) {
        console.error('[API] Error fetching ad sets from database:', error);
        } else if (data && data.length > 0) {
        cachedAdSets = data;
        console.log(`[API] Found ${data.length} ad sets in database`);
      } else {
        console.log('[API] No ad sets found in database');
      }
    }
    
    // If !forceRefresh and we have cached data, return it
    if (!forceRefresh && cachedAdSets && cachedAdSets.length > 0) {
      console.log(`[API] Returning ${cachedAdSets.length} cached ad sets`);
      
      return NextResponse.json(
        {
          success: true,
          source: 'database',
          timestamp: new Date().toISOString(),
          adSets: cachedAdSets,
          dateRange: hasDateRange ? { from: fromDate, to: toDate } : undefined
        },
        { status: 200 }
      );
    }
    
    // If we need to fetch from Meta API
    if (forceRefresh || !cachedAdSets || cachedAdSets.length === 0) {
      console.log('[API] Fetching ad sets from Meta API...');
    
      // Parse dates if provided
      let startDate, endDate;
    if (hasDateRange) {
        startDate = new Date(fromDate!);
        endDate = new Date(toDate!);
        console.log(`[API] Parsed date range for Meta API call: ${startDate.toISOString()} to ${endDate.toISOString()}`);
    }
    
      try {
        // Call the Meta service
    const result = await fetchMetaAdSets(
      brandId, 
      campaignId, 
          true, // forceSave
          startDate,
          endDate
        );
        
        // Add null check for result
        if (!result) {
          throw new Error('fetchMetaAdSets returned null or undefined');
        }
        
        if (result.success) {
          console.log(`[API] Successfully fetched ${result.adSets?.length || 0} ad sets from Meta API`);
          
          return NextResponse.json(
            {
              success: true,
              source: 'meta_api',
              timestamp: new Date().toISOString(),
              adSets: result.adSets
            },
            { status: 200 }
          );
        } else {
          // Check if this is a rate limit error
          const errorMsg = result.error || '';
          if (errorMsg.includes('rate limit') || 
              errorMsg.includes('too many calls') || 
              errorMsg.includes('too many api calls') ||
              errorMsg.toLowerCase().includes('rate_limit')) {
            
            console.log('[API] Meta API rate limit reached');
            
            // If we have cached data, return it with a warning
            if (cachedAdSets && cachedAdSets.length > 0) {
              console.log(`[API] Returning ${cachedAdSets.length} cached ad sets due to Meta API rate limit`);
              
              return NextResponse.json(
                {
                  success: true,
                  source: 'cached_due_to_rate_limit',
                  warning: 'Meta API rate limit reached',
                  message: 'Using cached data due to Meta API rate limits',
                  timestamp: new Date().toISOString(),
                  adSets: cachedAdSets,
                  dateRange: hasDateRange ? { from: fromDate, to: toDate } : undefined
                },
                { status: 200 }
              );
            }
            
            // Return a 429 with a warning that includes the full error message
            return NextResponse.json(
              {
                success: false,
                warning: 'Meta API rate limit reached',
                message: 'Too many API calls to Meta. Please try again in a few minutes.',
                error: errorMsg,
                timestamp: new Date().toISOString(),
                adSets: []
              },
              { status: 200 } // Still return 200 to avoid client-side errors
            );
      }
      
          // Other API errors
          console.error('[API] Error fetching ad sets from Meta API:', result.error);

          // If we have cached data, return it with a warning
          if (cachedAdSets && cachedAdSets.length > 0) {
            return NextResponse.json(
              {
                success: true,
                source: 'cached_due_to_exception',
                warning: 'Exception occurred',
                message: 'Using cached data due to an exception when fetching from Meta API',
                timestamp: new Date().toISOString(),
                adSets: cachedAdSets,
                dateRange: hasDateRange ? { from: fromDate, to: toDate } : undefined
              },
              { status: 200 }
            );
          }
          
          // Return the API error
          return NextResponse.json(
            {
              success: false,
              error: result.error || 'Unknown error fetching ad sets from Meta API',
              timestamp: new Date().toISOString(),
              adSets: []
            },
            { status: 200 } // Still return 200 to avoid client-side errors
          );
        }
      } catch (error) {
        console.error('[API] Exception when fetching ad sets from Meta API:', error);
        
        // If we have cached data, return it with a warning
        if (cachedAdSets && cachedAdSets.length > 0) {
          return NextResponse.json(
            {
              success: true,
              source: 'cached_due_to_exception',
              warning: 'Exception occurred',
              message: 'Using cached data due to an exception when fetching from Meta API',
              timestamp: new Date().toISOString(),
              adSets: cachedAdSets,
              dateRange: hasDateRange ? { from: fromDate, to: toDate } : undefined
            },
            { status: 200 }
          );
        }
        
        // Check if it's a rate limiting error
        const errorMessage = (error as Error).message;
        if (errorMessage.includes('User request limit reached') || 
            errorMessage.includes('rate limit') ||
            errorMessage.includes('Too many calls')) {
          return NextResponse.json(
            {
              success: false,
              isRateLimited: true,
              error: 'Meta API rate limit reached: User request limit reached',
              warning: 'Meta API rate limit reached',
              message: 'Too many API calls to Meta. Please try again in a few minutes.',
              retryAfter: 300, // 5 minutes
              timestamp: new Date().toISOString(),
              adSets: []
            },
            { status: 200 }
          );
        }

        // Return the exception
        return NextResponse.json(
          {
              success: false,
              error: `Exception when fetching ad sets: ${errorMessage}`,
              timestamp: new Date().toISOString(),
              adSets: []
            },
            { status: 200 } // Still return 200 to avoid client-side errors
          );
      }
    }
    
    // Fallback response for any other scenario
    return NextResponse.json(
      {
        success: false,
        error: 'No ad sets found',
        timestamp: new Date().toISOString(),
        adSets: []
        },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('[API] Unhandled exception in ad sets API:', error);
    return NextResponse.json(
      {
        success: false,
        error: `Unhandled exception: ${(error as Error).message}`,
        timestamp: new Date().toISOString(),
        adSets: []
      },
      { status: 200 } // Still return 200 to avoid client-side errors
    );
  }
} 