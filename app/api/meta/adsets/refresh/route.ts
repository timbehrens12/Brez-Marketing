import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs';
import { fetchMetaAdSets } from '@/lib/services/meta-service';

export const dynamic = 'force-dynamic';

// In-memory rate limiting (prevents multiple simultaneous requests)
const refreshInProgress = new Map<string, number>();
const RATE_LIMIT_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Single endpoint to refresh ALL ad set data from Meta API
 * This is called ONCE on page load to fetch:
 * - Ad set budgets (daily/lifetime)
 * - Ad set statuses (ACTIVE/PAUSED)
 * - Ad set names
 * 
 * All other endpoints read from the cached database data
 */
export async function POST(req: NextRequest) {
  try {
    // Verify user authentication
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - You must be logged in to access this resource' },
        { status: 401 }
      );
    }
    
    // Get brand ID from query parameters
    const searchParams = req.nextUrl.searchParams;
    const brandId = searchParams.get('brandId');
    
    if (!brandId) {
      return NextResponse.json(
        { error: 'Missing brandId parameter' },
        { status: 400 }
      );
    }
    
    // 🚨 SERVER-SIDE RATE LIMITING: Prevent concurrent refresh requests
    const rateLimitKey = `${userId}_${brandId}`;
    const lastRefreshTime = refreshInProgress.get(rateLimitKey) || 0;
    const now = Date.now();
    
    if (lastRefreshTime && (now - lastRefreshTime) < RATE_LIMIT_DURATION) {
      const remainingTime = Math.ceil((RATE_LIMIT_DURATION - (now - lastRefreshTime)) / 1000);
      console.log(`[AdSet Refresh] ⏱️ Rate limited - ${remainingTime}s remaining for brandId=${brandId}`);
      
      return NextResponse.json({
        success: true,
        cached: true,
        message: `Using cached data - refresh available in ${remainingTime} seconds`,
        remainingTime,
        timestamp: new Date().toISOString()
      });
    }
    
    // Set the rate limit timestamp
    refreshInProgress.set(rateLimitKey, now);
    
    console.log(`[AdSet Refresh] 🔄 Starting centralized ad set refresh for brandId=${brandId}`);
    
    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Get ALL campaigns for this brand (don't filter by status - we need to sync everything)
    // This ensures campaigns that were turned ON in Meta will be detected and synced
    const { data: campaigns, error: campaignError } = await supabase
      .from('meta_campaigns')
      .select('campaign_id, campaign_name, status')
      .eq('brand_id', brandId);
    
    if (campaignError) {
      console.error('[AdSet Refresh] Error fetching campaigns:', campaignError);
      return NextResponse.json(
        { error: 'Failed to fetch campaigns', details: campaignError.message },
        { status: 500 }
      );
    }
    
    if (!campaigns || campaigns.length === 0) {
      console.log('[AdSet Refresh] No campaigns found for this brand');
      return NextResponse.json({
        success: true,
        message: 'No campaigns found to refresh',
        campaignCount: 0,
        adSetCount: 0,
        timestamp: new Date().toISOString()
      });
    }
    
    console.log(`[AdSet Refresh] Found ${campaigns.length} campaigns to sync`);
    
    // Get Meta access token for campaign status checks
    const { data: connection } = await supabase
      .from('platform_connections')
      .select('access_token')
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')
      .eq('status', 'active')
      .single();
    
    // Fetch ad sets for each campaign from Meta API
    let totalAdSets = 0;
    const results = [];
    
    for (const campaign of campaigns) {
      try {
        console.log(`[AdSet Refresh] 📡 Fetching data for campaign ${campaign.campaign_id} (${campaign.campaign_name})`);
        
        // 🔥 FIRST: Fetch and update campaign status from Meta
        if (connection?.access_token) {
          try {
            const statusUrl = `https://graph.facebook.com/v18.0/${campaign.campaign_id}?fields=effective_status,status,configured_status&access_token=${connection.access_token}`;
            const statusResponse = await fetch(statusUrl, {
              cache: 'no-store',
              headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache'
              }
            });
            
            if (statusResponse.ok) {
              const statusData = await statusResponse.json();
              const freshStatus = statusData.effective_status || statusData.configured_status || statusData.status;
              
              // Update campaign status in database
              if (freshStatus && freshStatus !== campaign.status) {
                console.log(`[AdSet Refresh] 🔄 Campaign ${campaign.campaign_id} status changed: ${campaign.status} → ${freshStatus}`);
                await supabase
                  .from('meta_campaigns')
                  .update({ 
                    status: freshStatus,
                    last_refresh_date: new Date().toISOString()
                  })
                  .eq('campaign_id', campaign.campaign_id)
                  .eq('brand_id', brandId);
                
                // Update local campaign object for budget calculation
                campaign.status = freshStatus;
              } else if (freshStatus) {
                console.log(`[AdSet Refresh] ✅ Campaign ${campaign.campaign_id} status unchanged: ${freshStatus}`);
              }
            }
          } catch (statusError) {
            console.error(`[AdSet Refresh] ⚠️ Failed to fetch status for campaign ${campaign.campaign_id}:`, statusError);
            // Continue anyway - status update is optional
          }
        }
        
        // SECOND: Fetch ad sets from Meta API and save to database
        const result = await fetchMetaAdSets(
          brandId,
          campaign.campaign_id,
          true // forceSave = true
        );
        
        if (result.success && result.adSets && result.adSets.length > 0) {
          totalAdSets += result.adSets.length;
          results.push({
            campaignId: campaign.campaign_id,
            campaignName: campaign.campaign_name,
            adSetCount: result.adSets.length,
            success: true
          });
          console.log(`[AdSet Refresh] ✅ Synced ${result.adSets.length} ad sets for campaign ${campaign.campaign_name}`);
        } else {
          results.push({
            campaignId: campaign.campaign_id,
            campaignName: campaign.campaign_name,
            adSetCount: 0,
            success: true,
            note: result.error || 'No ad sets found'
          });
          console.log(`[AdSet Refresh] ℹ️ No ad sets found for campaign ${campaign.campaign_name}:`, result.error || 'empty result');
        }
      } catch (campaignError: any) {
        console.error(`[AdSet Refresh] ⚠️ Failed to sync ad sets for campaign ${campaign.campaign_name}:`, campaignError.message);
        results.push({
          campaignId: campaign.campaign_id,
          campaignName: campaign.campaign_name,
          adSetCount: 0,
          success: false,
          error: campaignError.message
        });
      }
    }
    
    console.log(`[AdSet Refresh] 🎉 Completed! Synced ${totalAdSets} ad sets across ${campaigns.length} campaigns`);
    
    // Clean up old rate limit entries (keep memory clean)
    const cleanupThreshold = now - (RATE_LIMIT_DURATION * 2); // 10 minutes old
    for (const [key, timestamp] of refreshInProgress.entries()) {
      if (timestamp < cleanupThreshold) {
        refreshInProgress.delete(key);
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Successfully refreshed ad sets for ${campaigns.length} campaigns`,
      campaignCount: campaigns.length,
      adSetCount: totalAdSets,
      results,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('[AdSet Refresh] Fatal error:', error);
    
    // Clear rate limit on error so user can retry sooner
    const searchParams = req.nextUrl.searchParams;
    const brandId = searchParams.get('brandId');
    if (brandId) {
      const { userId } = auth();
      const rateLimitKey = `${userId}_${brandId}`;
      refreshInProgress.delete(rateLimitKey);
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to refresh ad sets', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}

