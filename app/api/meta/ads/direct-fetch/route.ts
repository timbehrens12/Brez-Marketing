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
    
    // Check for rate limiting (using account ID to rate limit per account)
    if (isRateLimited(connection.account_id)) {
      console.log(`[Meta Ads Direct] Rate limited for account ${connection.account_id}`);
      
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
    logRequest(connection.account_id);
    
    // Simple direct fetch of ads from Meta
    const adsResponse = await fetch(
      `https://graph.facebook.com/v18.0/${data.adsetId}/ads?` +
      `fields=id,name,status,effective_status,preview_url,creative{id,thumbnail_url,image_url,title,body,link_url,call_to_action_type}&` +
      `limit=50&` +
      `access_token=${connection.access_token}`
    );
    
    if (!adsResponse.ok) {
      const errorText = await adsResponse.text();
      console.error(`[Meta Ads Direct] API error: ${errorText}`);
      
      // Check if this is a rate limit error
      if (errorText.includes('User request limit reached')) {
        // Try to get cached ads
        const { data: cachedAds } = await supabase
          .from('meta_ads')
          .select('*')
          .eq('adset_id', data.adsetId)
          .eq('brand_id', data.brandId);
          
        if (cachedAds && cachedAds.length > 0) {
          console.log(`[Meta Ads Direct] Returning ${cachedAds.length} cached ads due to Meta rate limiting`);
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
          success: true, // Return success with empty array to avoid error
          ads: []
        }, { status: 200 });
      }
      
      return NextResponse.json(
        { error: 'Failed to fetch ads from Meta', details: errorText },
        { status: 500 }
      );
    }
    
    const adsData = await adsResponse.json();
    console.log(`[Meta Ads Direct] Found ${adsData.data?.length || 0} ads`);
    
    if (!adsData.data || adsData.data.length === 0) {
      console.log(`[Meta Ads Direct] No ads found for ad set ${data.adsetId}`);
      return NextResponse.json({ 
        success: true, 
        message: 'No ads found',
        ads: [] 
      });
    }
    
    // Process ads into a simplified format
    const processedAds = adsData.data.map((ad: any) => {
      // Extract creative details if available
      const creative = ad.creative || {};
      
      return {
        ad_id: ad.id,
        ad_name: ad.name,
        adset_id: data.adsetId,
        campaign_id: '', // Not available in this API call
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
        // Set all metrics to 0 since we're not fetching insights in this direct endpoint
        spent: 0,
        impressions: 0,
        clicks: 0,
        reach: 0,
        ctr: 0,
        cpc: 0,
        conversions: 0,
        cost_per_conversion: 0
      };
    });
    
    // Return the processed ads
    return NextResponse.json({
      success: true,
      source: 'meta_api_direct',
      timestamp: new Date().toISOString(),
      ads: processedAds
    });
    
  } catch (error: any) {
    console.error('[Meta Ads Direct] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Server error', details: error.message },
      { status: 500 }
    );
  }
} 