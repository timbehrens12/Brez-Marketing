import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Simple in-memory rate limiting
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute window
const MAX_REQUESTS = 15; // Max requests per minute
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
  
  // Check account-specific rate limit if an account ID is provided
  if (accountId) {
    const accountRequests = requestLog.filter(r => r.accountId === accountId).length;
    if (accountRequests >= 3) { // Lower threshold for per-account
      return true;
    }
  }
  
  // Check global rate limit
  return requestLog.length >= MAX_REQUESTS;
}

// Add a request to the log
function logRequest(accountId?: string) {
  requestLog.push({
    timestamp: Date.now(),
    accountId
  });
}

/**
 * Direct API endpoint to fetch ad sets from Meta
 * This is a simplified version that focuses on reliability rather than complex processing
 */
export async function POST(request: NextRequest) {
  try {
    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );
    
    // Get request body
    const data = await request.json();
    
    // Validate required parameters
    if (!data.brandId) {
      return NextResponse.json({ error: 'brandId is required' }, { status: 400 });
    }
    
    if (!data.campaignId) {
      return NextResponse.json({ error: 'campaignId is required' }, { status: 400 });
    }
    
    // Check for date range parameters
    const fromDate = data.from;
    const toDate = data.to;
    const hasDateRange = fromDate && toDate;

    // Ensure the date range is inclusive and properly bounded
    // Note: API should respect the exact dates from the client and not modify them
    if (hasDateRange) {
      console.log(`[Meta AdSets Direct] Using date range from ${fromDate} to ${toDate} (inclusive)`);
    }

    console.log(`[Meta AdSets Direct] Fetching ad sets for campaign ${data.campaignId}${hasDateRange ? ` with date range ${fromDate} to ${toDate}` : ''}`);
    
    // Get the Meta connection
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('brand_id', data.brandId)
      .eq('platform_type', 'meta')
      .eq('status', 'active')
      .single();
    
    if (connectionError || !connection) {
      console.error('[Meta AdSets Direct] Failed to get Meta connection:', connectionError);
      return NextResponse.json(
        { error: 'No active Meta connection found' },
        { status: 400 }
      );
    }
    
    // Check for rate limiting (using account ID to rate limit per account)
    if (isRateLimited(connection.account_id)) {
      console.log(`[Meta AdSets Direct] Rate limited for account ${connection.account_id}`);
      
      // Check if we have cached ad sets for this campaign
      let query = supabase
        .from('meta_adsets')
        .select('*')
        .eq('campaign_id', data.campaignId)
        .eq('brand_id', data.brandId);
        
      // If date range is provided, use it for DB query
      if (hasDateRange) {
        // Get related insights in the date range
        console.log(`[Meta AdSets Direct] Applying date range filter to DB query: ${fromDate} to ${toDate}`);
        // Since we can't easily filter ad sets by date range directly (would need joins),
        // we'll return cached ad sets and let the client filter them
      }
      
      const { data: cachedAdSets } = await query;
        
      if (cachedAdSets && cachedAdSets.length > 0) {
        console.log(`[Meta AdSets Direct] Returning ${cachedAdSets.length} cached ad sets due to rate limiting`);
        return NextResponse.json({
          success: true,
          source: 'cached_due_to_rate_limit',
          message: 'Using cached data due to Meta API rate limits',
          dateRange: hasDateRange ? { from: fromDate, to: toDate } : undefined,
          adSets: cachedAdSets
        });
      }
      
      return NextResponse.json({
        warning: 'Meta API rate limit reached',
        message: 'Please try again in a few minutes',
        success: false,
        dateRange: hasDateRange ? { from: fromDate, to: toDate } : undefined,
        adSets: []
      }, { status: 429 });
    }
    
    // Log this request for rate limiting
    logRequest(connection.account_id);
    
    // Prepare date parameters for Meta API if present
    let dateParameters = '';
    if (hasDateRange) {
      // For direct API calls, we should use the date range parameters
      // but Meta's Ads API doesn't directly filter ad sets by date
      console.log(`[Meta AdSets Direct] Will need to get insights with date range: ${fromDate} to ${toDate}`);
      // We don't add date parameters to ad set fetch, as they're only used for insights
    }
    
    // Simple direct fetch of ad sets from Meta
    const adSetsResponse = await fetch(
      `https://graph.facebook.com/v18.0/${data.campaignId}/adsets?` +
      `fields=id,name,status,daily_budget,lifetime_budget,budget_remaining,start_time,end_time,optimization_goal&` +
      `limit=100&` +
      `access_token=${connection.access_token}`
    );
    
    if (!adSetsResponse.ok) {
      return NextResponse.json(
        { 
          error: 'Failed to fetch ad sets from Meta API',
          statusCode: adSetsResponse.status,
          statusText: adSetsResponse.statusText
        },
        { status: 500 }
      );
    }
    
    const adSetsData = await adSetsResponse.json();
    
    if (!adSetsData.data || adSetsData.data.length === 0) {
      return NextResponse.json({
        success: true,
        source: 'meta_api_direct',
        timestamp: new Date().toISOString(),
        dateRange: hasDateRange ? { from: fromDate, to: toDate } : undefined,
        adSets: []
      });
    }
    
    console.log(`[Meta AdSets Direct] Found ${adSetsData.data.length} ad sets`);
    
    // For each ad set, try to fetch performance metrics IF date range is provided
    let adSetsWithMetrics = [...adSetsData.data];
    
    // If date range is provided, try to fetch insights
    if (hasDateRange) {
      try {
        console.log(`[Meta AdSets Direct] Attempting to fetch insights for ${adSetsData.data.length} ad sets with date range`);
        
        // Process in batches to avoid rate limits - max 5 ad sets at a time
        const batchSize = 5;
        const batches = Math.ceil(adSetsData.data.length / batchSize);
        
        for (let batchIndex = 0; batchIndex < batches; batchIndex++) {
          const batchStart = batchIndex * batchSize;
          const batchEnd = Math.min(batchStart + batchSize, adSetsData.data.length);
          const batch = adSetsData.data.slice(batchStart, batchEnd);
          
          console.log(`[Meta AdSets Direct] Processing batch ${batchIndex + 1}/${batches} with ${batch.length} ad sets`);
          
          // Process each ad set in the batch
          for (let i = 0; i < batch.length; i++) {
            const adSet = batch[i];
            
            // Only attempt insights fetch if we're not rate limited
            if (!isRateLimited(connection.account_id)) {
              try {
                // Log this request for rate limiting
                logRequest(connection.account_id);
                
                // Fetch insights for this specific ad set with the date range
                const insightsResponse = await fetch(
                  `https://graph.facebook.com/v18.0/${adSet.id}/insights?` +
                  `fields=spend,impressions,clicks,conversions,ctr,cpc,cost_per_conversion,reach&` +
                  `time_range={"since":"${fromDate}","until":"${toDate}"}&` +
                  `access_token=${connection.access_token}`
                );
                
                if (insightsResponse.ok) {
                  const insightsData = await insightsResponse.json();
                  
                  if (insightsData.data && insightsData.data.length > 0) {
                    // Insights found, add metrics to this ad set
                    const insights = insightsData.data[0]; // Get the aggregated insights
                    
                    // Update the ad set with the metrics
                    const adSetIndex = adSetsWithMetrics.findIndex(a => a.id === adSet.id);
                    if (adSetIndex !== -1) {
                      adSetsWithMetrics[adSetIndex] = {
                        ...adSetsWithMetrics[adSetIndex],
                        // Add metrics from insights
                        has_metrics: true,
                        spent: Number(insights.spend || 0),
                        impressions: Number(insights.impressions || 0),
                        clicks: Number(insights.clicks || 0),
                        reach: Number(insights.reach || 0),
                        ctr: Number(insights.ctr || 0),
                        cpc: Number(insights.cpc || 0),
                        cost_per_conversion: insights.cost_per_conversion ? Number(insights.cost_per_conversion) : 0,
                        conversions: insights.conversions ? Number(insights.conversions[0]?.value || 0) : 0
                      };
                    }
                  }
                }
              } catch (insightError) {
                console.error(`[Meta AdSets Direct] Error fetching insights for ad set ${adSet.id}:`, insightError);
              }
            } else {
              console.log(`[Meta AdSets Direct] Rate limited, skipping insights fetch for remaining ad sets`);
              break; // Exit the loop if rate limited
            }
          }
        }
      } catch (error) {
        console.error(`[Meta AdSets Direct] Error fetching ad set insights:`, error);
      }
    }
    
    // Process ad sets into a simplified format
    const processedAdSets = adSetsWithMetrics.map((adSet: any) => {
      // Determine budget
      let budget = 0;
      let budgetType = 'unknown';
      
      if (adSet.daily_budget) {
        budget = parseInt(adSet.daily_budget, 10) / 100; // Convert cents to dollars
        budgetType = 'daily';
      } else if (adSet.lifetime_budget) {
        budget = parseInt(adSet.lifetime_budget, 10) / 100; // Convert cents to dollars
        budgetType = 'lifetime';
      }
      
      // If no metrics were available from the API but we have clicks and impressions,
      // let's calculate derived metrics like CTR and CPC ourselves
      const hasMetrics = adSet.has_metrics || false;
      const spent = hasMetrics ? adSet.spent : 0;
      const impressions = hasMetrics ? adSet.impressions : 0;
      const clicks = hasMetrics ? adSet.clicks : 0;
      
      // Calculate CTR if we have impressions
      let ctr = hasMetrics ? adSet.ctr : 0;
      if (impressions > 0 && clicks > 0 && (!ctr || ctr === 0)) {
        ctr = (clicks / impressions) * 100;
      }
      
      // Calculate CPC if we have clicks and spend
      let cpc = hasMetrics ? adSet.cpc : 0;
      if (clicks > 0 && spent > 0 && (!cpc || cpc === 0)) {
        cpc = spent / clicks;
      }
      
      return {
        id: Math.random().toString(36).substring(2, 15), // Generate a temporary ID
        brand_id: data.brandId,
        adset_id: adSet.id,
        adset_name: adSet.name,
        campaign_id: data.campaignId,
        status: adSet.status,
        budget,
        budget_type: budgetType,
        optimization_goal: adSet.optimization_goal || null,
        // Use metrics from insights if available, otherwise default to 0
        spent: spent,
        impressions: impressions,
        clicks: clicks,
        reach: hasMetrics ? adSet.reach : 0,
        conversions: hasMetrics ? adSet.conversions : 0,
        ctr: ctr,
        cpc: cpc,
        cost_per_conversion: hasMetrics ? adSet.cost_per_conversion : 0,
        updated_at: new Date().toISOString()
      };
    });
    
    // Return the processed ad sets
    return NextResponse.json({
      success: true,
      source: 'meta_api_direct',
      timestamp: new Date().toISOString(),
      dateRange: hasDateRange ? { from: fromDate, to: toDate } : undefined,
      adSets: processedAdSets
    });
    
  } catch (error: any) {
    console.error('[Meta AdSets Direct] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Server error', details: error.message },
      { status: 500 }
    );
  }
} 