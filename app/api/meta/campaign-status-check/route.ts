/**
 * Meta Campaign Status Check API
 * 
 * This API fetches the current status of a Meta campaign directly from the Meta API.
 * It's used to ensure campaign statuses are always up-to-date in the UI.
 * 
 * FIXED: Campaign status display issue - Campaigns now properly reflect their current status
 * in the UI after implementing force refresh, status normalization, and periodic checks.
 */

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
    const { brandId, campaignId, forceRefresh } = body;

    // Validate required parameters
    if (!brandId) {
      return NextResponse.json({ error: 'Missing brandId parameter' }, { status: 400 });
    }

    if (!campaignId) {
      return NextResponse.json({ error: 'Missing campaignId parameter' }, { status: 400 });
    }

    console.log(`[campaign-status-check] Checking status for campaign ${campaignId} for brand ${brandId}, force refresh: ${forceRefresh}`);

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
      console.error('[campaign-status-check] Meta connection not found for brandId:', brandId, 'Error:', connectionError);
      return NextResponse.json({ error: 'Meta connection not found' }, { status: 404 });
    }

    // ADDED: Log the retrieved connection details for debugging
    console.log(`[campaign-status-check] Found connection for brand ${brandId}:`, {
      connectionId: connection.id,
      hasAccessToken: !!connection.access_token,
      hasAdAccountId: !!(connection.metadata && typeof connection.metadata === 'object' && connection.metadata.ad_account_id),
      accountId: connection.metadata?.account_id,
      status: connection.status
    });

    // Skip rate limiting if force refresh is true
    const accountIdForRateLimit = connection.metadata?.account_id;
    if (!forceRefresh && isRateLimited(accountIdForRateLimit)) {
      console.log(`[campaign-status-check] Rate limited for account ${accountIdForRateLimit}`);
      
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

    // Log this request for rate limiting if not a force refresh
    if (!forceRefresh) {
      logRequest(accountIdForRateLimit);
    }

    // Direct API call to Meta
    const accessToken = connection.access_token;
    let adAccountId = connection.metadata?.ad_account_id;

    if (!accessToken) {
      console.error(`[campaign-status-check] Returning 400 due to missing access token for brand ${brandId}`);
      return NextResponse.json(
        { error: 'Missing Meta access token' },
        { status: 400 }
      );
    }

    // If ad_account_id is missing, try to fetch it from Meta API
    if (!adAccountId) {
      console.log(`[campaign-status-check] No ad_account_id in metadata, attempting to fetch from Meta API`);
      
      try {
        // Fetch ad accounts from Meta
        const accountsResponse = await fetch(
          `https://graph.facebook.com/v18.0/me/adaccounts?fields=name,account_id&access_token=${accessToken}`
        );
        
        if (!accountsResponse.ok) {
          const error = await accountsResponse.json();
          console.error('[campaign-status-check] Error fetching ad accounts:', error);
          return NextResponse.json({ error: 'Error fetching ad accounts from Meta', details: error }, { status: 500 });
        }
        
        const accountsData = await accountsResponse.json();
        
        if (!accountsData.data || accountsData.data.length === 0) {
          console.error('[campaign-status-check] No ad accounts found for this Meta user');
          return NextResponse.json({ error: 'No ad accounts found for this Meta user' }, { status: 400 });
        }
        
        // Use the first ad account
        const firstAccount = accountsData.data[0];
        const accountId = firstAccount.account_id || firstAccount.id.replace('act_', '');
        adAccountId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
        
        console.log(`[campaign-status-check] Found ad account id: ${adAccountId}, updating connection metadata`);
        
        // Update the connection with the ad_account_id
        const updatedMetadata = {
          ...(connection.metadata || {}),
          ad_account_id: adAccountId
        };
        
        const { error: updateError } = await supabase
          .from('platform_connections')
          .update({ metadata: updatedMetadata })
          .eq('id', connection.id);
        
        if (updateError) {
          console.error('[campaign-status-check] Error updating connection metadata:', updateError);
          // Continue anyway since we have the adAccountId for this request
        } else {
          console.log(`[campaign-status-check] Updated connection ${connection.id} with ad_account_id: ${adAccountId}`);
        }
      } catch (error) {
        console.error('[campaign-status-check] Error fetching ad accounts:', error);
        return NextResponse.json({ error: 'Error fetching ad accounts', details: error }, { status: 500 });
      }
    }

    // Fetch campaign status from Meta
    try {
      // Use effective_status and configured_status fields for better accuracy
      const apiUrl = `https://graph.facebook.com/v18.0/${campaignId}?fields=effective_status,status,configured_status&access_token=${accessToken}`;
      console.log(`[campaign-status-check] Calling Meta API for campaign ${campaignId}`);
      
      const response = await fetch(apiUrl, { 
        cache: forceRefresh ? 'no-store' : 'default',
        headers: {
          // Add cache control headers to ensure we get fresh data
          'Cache-Control': forceRefresh ? 'no-cache, no-store, must-revalidate' : 'max-age=300',
          'Pragma': forceRefresh ? 'no-cache' : 'cache',
          // Add a unique request ID to help with debugging
          'X-Request-ID': `status-check-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        }
      });
      
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
      
      // Prioritize effective_status which gives the real runtime status
      // Fall back to configured_status or status if necessary
      const campaignStatus = data.effective_status || data.configured_status || data.status || 'UNKNOWN';
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
      
      // Revalidate related paths to ensure fresh data
      revalidatePath('/dashboard');
      revalidatePath(`/dashboard/${brandId}`);
      
      return NextResponse.json({
        success: true,
        campaignId,
        brandId,
        status: campaignStatus,
        timestamp: new Date().toISOString(),
        message: `Campaign status: ${campaignStatus}`,
        force_refreshed: !!forceRefresh
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