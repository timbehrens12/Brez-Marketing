import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withMetaRateLimit } from '@/lib/services/meta-rate-limiter';

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
 * Direct API endpoint to fetch ads from Meta
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
    
    if (!data.adsetId) {
      return NextResponse.json({ error: 'adsetId is required' }, { status: 400 });
    }
    
    console.log(`[Meta Ads Direct] Fetching ads for ad set ${data.adsetId}`);
    
    // Get the Meta connection
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('brand_id', data.brandId)
      .eq('platform_type', 'meta')
      .eq('status', 'active')
      .single();
    
    if (connectionError || !connection) {
      console.error('[Meta Ads Direct] Failed to get Meta connection:', connectionError);
      return NextResponse.json(
        { error: 'No active Meta connection found' },
        { status: 400 }
      );
    }
    
    // Get account ID from connection or metadata
    let accountId = connection.account_id;
    if (!accountId && connection.metadata?.account_id) {
      accountId = connection.metadata.account_id;
    }
    if (!accountId) {
      accountId = 'unknown'; // Fallback for rate limiter
    }
    
    // Check for rate limiting (using account ID to rate limit per account)
    if (isRateLimited(accountId)) {
      console.log(`[Meta Ads Direct] Rate limited for account ${accountId}`);
      
      // Check if we have cached ads for this ad set
      const { data: cachedAds } = await supabase
        .from('meta_ads')
        .select('*')
        .eq('adset_id', data.adsetId)
        .eq('brand_id', data.brandId);
        
      if (cachedAds && cachedAds.length > 0) {
        console.log(`[Meta Ads Direct] Returning ${cachedAds.length} cached ads due to rate limiting`);
        return NextResponse.json({
          success: true,
          source: 'cached_due_to_rate_limit',
          message: 'Using cached data due to Meta API rate limits',
          ads: cachedAds
        });
      }
      
      return NextResponse.json({
        warning: 'Meta API rate limit reached',
        message: 'Please try again in a few minutes',
        success: true, // Return as success with empty array to avoid error
        ads: []
      }, { status: 200 });
    }
    
    // Log this request for rate limiting
    logRequest(accountId);
    
    // Use rate limiter to safely fetch ads from Meta API
    const adsData = await withMetaRateLimit(
      accountId,
      async () => {
        const adsResponse = await fetch(
          `https://graph.facebook.com/v18.0/${data.adsetId}/ads?` +
          `fields=id,name,status,effective_status,preview_url,creative{id,thumbnail_url,image_url,title,body,link_url,call_to_action_type}&` +
          `limit=50&` +
          `access_token=${connection.access_token}`
        );
        
        if (!adsResponse.ok) {
          const errorData = await adsResponse.json();
          throw errorData;
        }
        
        return await adsResponse.json();
      },
      0, // Normal priority
      `ads-direct-fetch-${data.adsetId}`
    );
    console.log(`[Meta Ads Direct] Found ${adsData.data?.length || 0} ads`);
    
    if (!adsData.data || adsData.data.length === 0) {
      console.log(`[Meta Ads Direct] No ads found for ad set ${data.adsetId}`);
      return NextResponse.json({ 
        success: true, 
        message: 'No ads found',
        ads: [] 
      });
    }
    
    // Prepare date range for insights query
    let timeRange = {};
    if (data.dateRange && data.dateRange.from && data.dateRange.to) {
      timeRange = {
        since: data.dateRange.from,
        until: data.dateRange.to,
      };
      console.log(`[Meta Ads Direct] Using time range for insights:`, timeRange);
    } else {
      // Default to last 7 days if no range provided (or log a warning)
      const today = new Date();
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 7);
      timeRange = {
        since: sevenDaysAgo.toISOString().split('T')[0],
        until: today.toISOString().split('T')[0],
      };
      console.warn(`[Meta Ads Direct] No dateRange provided, defaulting to last 7 days for insights:`, timeRange);
    }
    
    // Process ads and fetch insights individually
    const processedAdsPromises = adsData.data.map(async (ad: any) => {
      // Extract creative details if available
      const creative = ad.creative || {};
      
      let adInsights = {
        spent: 0,
        impressions: 0,
        clicks: 0,
        reach: 0,
        ctr: 0,
        cpc: 0,
        conversions: 0, // Placeholder for primary conversion event
        cost_per_conversion: 0, // Placeholder
      };
      
            try {
        console.log(`[Meta Ads Direct] Fetching insights for ad ${ad.id} with date range:`, timeRange);
        
        const insightsData = await withMetaRateLimit(
          accountId,
          async () => {
            const insightsParams = new URLSearchParams({
              fields: 'spend,impressions,clicks,reach,ctr,cpc,actions',
              time_range: JSON.stringify(timeRange),
              access_token: connection.access_token,
            });
            
            const insightsResponse = await fetch(
              `https://graph.facebook.com/v18.0/${ad.id}/insights?${insightsParams.toString()}`
            );
            
            if (!insightsResponse.ok) {
              const errorData = await insightsResponse.json();
              throw errorData;
            }
            
            return await insightsResponse.json();
          },
          -1, // Lower priority than main API calls
          `insights-${ad.id}`
        );
        
        if (insightsData.data && insightsData.data.length > 0) {
          const insights = insightsData.data[0];
            adInsights.spent = parseFloat(insights.spend || '0');
            adInsights.impressions = parseInt(insights.impressions || '0', 10);
            adInsights.clicks = parseInt(insights.clicks || '0', 10);
            adInsights.reach = parseInt(insights.reach || '0', 10);
            adInsights.ctr = parseFloat(insights.ctr || '0') / 100; // Convert percentage to ratio
            adInsights.cpc = parseFloat(insights.cpc || '0');
            
            // Find primary conversion action (example: 'offsite_conversion.fb_pixel_purchase')
            // This needs customization based on the actual conversion events used
            const primaryAction = insights.actions?.find((a: any) => a.action_type.includes('purchase')); 
            adInsights.conversions = primaryAction ? parseInt(primaryAction.value || '0', 10) : 0;
            
            if (adInsights.conversions > 0 && adInsights.spent > 0) {
              adInsights.cost_per_conversion = adInsights.spent / adInsights.conversions;
            } else {
              adInsights.cost_per_conversion = 0;
            }
            
            console.log(`[Meta Ads Direct] Insights SUCCESS for ad ${ad.id}: Spend=${adInsights.spent}, Clicks=${adInsights.clicks}, Impr=${adInsights.impressions}`);
            
        } else {
          console.log(`[Meta Ads Direct] No insights data found for ad ${ad.id} in the specified time range, showing zeros`);
        }
         
        } catch (insightsError: any) {
          console.error(`[Meta Ads Direct] Error fetching insights for ad ${ad.id}:`, insightsError);
          // Keep default zeroed metrics on error
        }
      
      return {
        ad_id: ad.id,
        ad_name: ad.name,
        adset_id: data.adsetId, // Use adsetId from request data
        campaign_id: '', // Still not available from /ads edge, might need another call or join
        status: ad.status,
        effective_status: ad.effective_status,
        creative_id: creative.id || null,
        preview_url: ad.preview_url || null,
        thumbnail_url: creative.thumbnail_url || null,
        image_url: creative.image_url || null,
        headline: creative.title || null,
        body: creative.body || null,
        cta_type: creative.call_to_action_type || null,
        link_url: creative.link_url || null,
        
        // Populate with fetched insights
        spent: adInsights.spent,
        impressions: adInsights.impressions,
        clicks: adInsights.clicks,
        reach: adInsights.reach,
        ctr: adInsights.ctr, // Now a ratio
        cpc: adInsights.cpc,
        conversions: adInsights.conversions,
        cost_per_conversion: adInsights.cost_per_conversion,
        // daily_insights: [] // Not fetching daily breakdown here
      };
    });
    
    // Wait for all insights fetches to complete
    const processedAds = await Promise.all(processedAdsPromises);
    
    console.log(`[Meta Ads Direct] Finished processing ${processedAds.length} ads with insights.`);
    
    // TODO: Consider storing these processed ads with insights into Supabase `meta_ads` table
    
    return NextResponse.json({
      success: true,
      ads: processedAds,
      source: 'meta_api_direct_with_insights' // Indicate source
    });
  } catch (error: any) {
    console.error('[Meta Ads Direct] General Error:', error);
    return NextResponse.json(
      { error: 'Server error', details: error.message },
      { status: 500 }
    );
  }
} 