import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

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
 * API route for directly checking campaign status from Meta
 * This enables immediate status updates instead of waiting for the sync process
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { brandId, campaignId } = body;

    // Validate required parameters
    if (!brandId) {
      return NextResponse.json({ error: 'Missing brandId parameter' }, { status: 400 });
    }

    if (!campaignId) {
      return NextResponse.json({ error: 'Missing campaignId parameter' }, { status: 400 });
    }

    console.log(`[campaign-status-check] Checking status for campaign ${campaignId} for brand ${brandId}`);

    // Create Supabase client
    const supabase = createClient();

    // Get Meta connection
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')
      .eq('status', 'active')
      .single();

    if (connectionError || !connection) {
      console.error('[campaign-status-check] Meta connection not found:', connectionError);
      return NextResponse.json({ error: 'Meta connection not found' }, { status: 404 });
    }

    // Check for rate limiting (using account ID to rate limit per account)
    if (isRateLimited(connection.account_id)) {
      console.log(`[campaign-status-check] Rate limited for account ${connection.account_id}`);
      
      // Check if we have cached campaign data
      const { data: cachedCampaign } = await supabase
        .from('meta_campaigns')
        .select('status, last_refresh_date')
        .eq('campaign_id', campaignId)
        .eq('brand_id', brandId)
        .single();
        
      if (cachedCampaign) {
        console.log(`[campaign-status-check] Returning cached status (${cachedCampaign.status}) due to rate limiting`);
        return NextResponse.json({
          success: true,
          source: 'cached_due_to_rate_limit',
          message: 'Using cached data due to Meta API rate limits',
          campaignId,
          brandId,
          status: cachedCampaign.status,
          lastRefreshDate: cachedCampaign.last_refresh_date,
          timestamp: new Date().toISOString()
        });
      }
      
      return NextResponse.json({
        warning: 'Meta API rate limit reached',
        message: 'Please try again in a few minutes',
        success: false
      }, { status: 429 });
    }

    // Log this request for rate limiting
    logRequest(connection.account_id);

    // Direct API call to Meta
    const accessToken = connection.access_token;
    const adAccountId = connection.ad_account_id;

    if (!accessToken || !adAccountId) {
      return NextResponse.json(
        { error: 'Missing Meta credentials or ad account ID' },
        { status: 400 }
      );
    }

    // Fetch campaign status from Meta
    try {
      const apiUrl = `https://graph.facebook.com/v18.0/${campaignId}?fields=effective_status,status&access_token=${accessToken}`;
      console.log(`[campaign-status-check] Calling Meta API for campaign ${campaignId}`);
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[campaign-status-check] Meta API error:', errorText);
        
        // Check if this is a rate limit error
        if (errorText.includes('User request limit reached')) {
          // Try to get cached campaign
          const { data: cachedCampaign } = await supabase
            .from('meta_campaigns')
            .select('status, last_refresh_date')
            .eq('campaign_id', campaignId)
            .eq('brand_id', brandId)
            .single();
            
          if (cachedCampaign) {
            console.log(`[campaign-status-check] Returning cached status due to Meta rate limiting`);
            return NextResponse.json({
              success: true,
              source: 'cached_due_to_rate_limit',
              message: 'Using cached data due to Meta API rate limits',
              campaignId,
              brandId,
              status: cachedCampaign.status,
              lastRefreshDate: cachedCampaign.last_refresh_date,
              timestamp: new Date().toISOString()
            });
          }
        }
        
        return NextResponse.json(
          { error: 'Failed to fetch campaign status from Meta', details: errorText },
          { status: response.status }
        );
      }
      
      const data = await response.json();
      console.log(`[campaign-status-check] Meta response:`, data);
      
      // Use effective_status or status, whichever is available
      const campaignStatus = data.effective_status || data.status || 'UNKNOWN';
      console.log(`[campaign-status-check] Campaign ${campaignId} status: ${campaignStatus}`);
      
      // Update campaign status in database
      const { error: updateError } = await supabase
        .from('meta_campaigns')
        .update({ 
          status: campaignStatus, 
          last_refresh_date: new Date().toISOString() 
        })
        .eq('campaign_id', campaignId)
        .eq('brand_id', brandId);
      
      if (updateError) {
        console.error('[campaign-status-check] Error updating campaign status:', updateError);
      } else {
        console.log(`[campaign-status-check] Updated status in database for campaign ${campaignId}`);
      }
      
      // Revalidate related paths
      revalidatePath('/dashboard');
      revalidatePath(`/dashboard/${brandId}`);
      
      return NextResponse.json({
        success: true,
        campaignId,
        brandId,
        status: campaignStatus,
        timestamp: new Date().toISOString(),
        message: `Campaign status: ${campaignStatus}`
      });
    } catch (apiError) {
      console.error('[campaign-status-check] Error calling Meta API:', apiError);
      return NextResponse.json(
        { error: 'Error checking campaign status', details: (apiError as Error).message },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[campaign-status-check] Server error:', error);
    return NextResponse.json(
      { error: 'Server error', details: (error as Error).message },
      { status: 500 }
    );
  }
} 