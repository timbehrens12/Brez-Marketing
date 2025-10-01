import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs';
import { fetchMetaAdSets } from '@/lib/services/meta-service';

export const dynamic = 'force-dynamic';

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
    
    console.log(`[AdSet Refresh] 🔄 Starting centralized ad set refresh for brandId=${brandId}`);
    
    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Get all active campaigns for this brand
    const { data: campaigns, error: campaignError } = await supabase
      .from('meta_campaigns')
      .select('campaign_id, campaign_name, status')
      .eq('brand_id', brandId)
      .eq('status', 'ACTIVE');
    
    if (campaignError) {
      console.error('[AdSet Refresh] Error fetching campaigns:', campaignError);
      return NextResponse.json(
        { error: 'Failed to fetch campaigns', details: campaignError.message },
        { status: 500 }
      );
    }
    
    if (!campaigns || campaigns.length === 0) {
      console.log('[AdSet Refresh] No active campaigns found');
      return NextResponse.json({
        success: true,
        message: 'No active campaigns to refresh',
        campaignCount: 0,
        adSetCount: 0,
        timestamp: new Date().toISOString()
      });
    }
    
    console.log(`[AdSet Refresh] Found ${campaigns.length} active campaigns`);
    
    // Fetch ad sets for each campaign from Meta API
    let totalAdSets = 0;
    const results = [];
    
    for (const campaign of campaigns) {
      try {
        console.log(`[AdSet Refresh] 📡 Fetching ad sets for campaign ${campaign.campaign_id} (${campaign.campaign_name})`);
        
        // This will fetch from Meta API and save to database
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
    return NextResponse.json(
      { 
        error: 'Failed to refresh ad sets', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}

