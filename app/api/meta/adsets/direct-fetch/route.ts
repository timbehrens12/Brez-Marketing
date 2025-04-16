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
    
    console.log(`[Meta AdSets Direct] Fetching ad sets for campaign ${data.campaignId}`);
    
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
      const { data: cachedAdSets } = await supabase
        .from('meta_adsets')
        .select('*')
        .eq('campaign_id', data.campaignId)
        .eq('brand_id', data.brandId);
        
      if (cachedAdSets && cachedAdSets.length > 0) {
        console.log(`[Meta AdSets Direct] Returning ${cachedAdSets.length} cached ad sets due to rate limiting`);
        return NextResponse.json({
          success: true,
          source: 'cached_due_to_rate_limit',
          message: 'Using cached data due to Meta API rate limits',
          adSets: cachedAdSets
        });
      }
      
      return NextResponse.json({
        warning: 'Meta API rate limit reached',
        message: 'Please try again in a few minutes',
        success: false,
        adSets: []
      }, { status: 429 });
    }
    
    // Log this request for rate limiting
    logRequest(connection.account_id);
    
    // Simple direct fetch of ad sets from Meta
    const adSetsResponse = await fetch(
      `https://graph.facebook.com/v18.0/${data.campaignId}/adsets?` +
      `fields=id,name,status,daily_budget,lifetime_budget,budget_remaining,start_time,end_time,optimization_goal&` +
      `limit=100&` +
      `access_token=${connection.access_token}`
    );
    
    if (!adSetsResponse.ok) {
      const errorText = await adSetsResponse.text();
      console.error(`[Meta AdSets Direct] API error: ${errorText}`);
      
      // Check if this is a rate limit error
      if (errorText.includes('User request limit reached')) {
        // Try to get cached ad sets
        const { data: cachedAdSets } = await supabase
          .from('meta_adsets')
          .select('*')
          .eq('campaign_id', data.campaignId)
          .eq('brand_id', data.brandId);
          
        if (cachedAdSets && cachedAdSets.length > 0) {
          console.log(`[Meta AdSets Direct] Returning ${cachedAdSets.length} cached ad sets due to Meta rate limiting`);
          return NextResponse.json({
            success: true,
            source: 'cached_due_to_rate_limit',
            message: 'Using cached data due to Meta API rate limits',
            adSets: cachedAdSets
          });
        }
        
        return NextResponse.json({
          warning: 'Meta API rate limit reached',
          message: 'Please try again in a few minutes',
          success: true, // Consider it a "success" with empty data rather than an error
          adSets: []
        }, { status: 200 }); // Use 200 instead of 429 to handle rate limits gracefully
      }
      
      return NextResponse.json(
        { error: 'Failed to fetch ad sets from Meta', details: errorText },
        { status: 500 }
      );
    }
    
    const adSetsData = await adSetsResponse.json();
    console.log(`[Meta AdSets Direct] Found ${adSetsData.data?.length || 0} ad sets`);
    
    if (!adSetsData.data || adSetsData.data.length === 0) {
      console.log(`[Meta AdSets Direct] No ad sets found for campaign ${data.campaignId}`);
      return NextResponse.json({ 
        success: true, 
        message: 'No ad sets found',
        adSets: [] 
      });
    }
    
    // Process ad sets into a simplified format
    const processedAdSets = adSetsData.data.map((adSet: any) => {
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
        // Set all metrics to 0 since we're not fetching insights in this direct endpoint
        spent: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        ctr: 0,
        cpc: 0,
        cost_per_conversion: 0,
        updated_at: new Date().toISOString()
      };
    });
    
    // Return the processed ad sets
    return NextResponse.json({
      success: true,
      source: 'meta_api_direct',
      timestamp: new Date().toISOString(),
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