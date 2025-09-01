/**
 * Meta Campaign Status Bulk Refresh API
 * 
 * This API forces a refresh of all campaign statuses for a brand.
 * It bypasses rate limiting and caching to ensure fresh data.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { brandId } = body;

    // Validate required parameters
    if (!brandId) {
      return NextResponse.json({ error: 'Missing brandId parameter' }, { status: 400 });
    }

    console.log(`[refresh-campaign-statuses] Refreshing all campaign statuses for brand ${brandId}`);

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
      console.error('[refresh-campaign-statuses] Meta connection not found:', connectionError);
      return NextResponse.json({ error: 'Meta connection not found' }, { status: 404 });
    }

    // Get all campaigns for this brand
    const { data: campaigns, error: campaignsError } = await supabase
      .from('meta_campaigns')
      .select('campaign_id')
      .eq('brand_id', brandId);

    if (campaignsError) {
      console.error('[refresh-campaign-statuses] Error fetching campaigns:', campaignsError);
      return NextResponse.json({ error: 'Error fetching campaigns' }, { status: 500 });
    }

    if (!campaigns || campaigns.length === 0) {
      return NextResponse.json({ 
        message: 'No campaigns found for this brand',
        count: 0,
        success: true
      });
    }

    console.log(`[refresh-campaign-statuses] Found ${campaigns.length} campaigns to refresh`);

    // Direct API call to Meta for each campaign
    const accessToken = connection.access_token;
    const refreshResults = [];

    // Process campaigns in batches to avoid overwhelming the API
    const BATCH_SIZE = 5;
    const campaignBatches = [];
    
    for (let i = 0; i < campaigns.length; i += BATCH_SIZE) {
      campaignBatches.push(campaigns.slice(i, i + BATCH_SIZE));
    }
    
    console.log(`[refresh-campaign-statuses] Processing ${campaignBatches.length} batches`);

    for (const batch of campaignBatches) {
      const batchPromises = batch.map(async (campaign) => {
        try {
          // Construct the API URL
          const apiUrl = `https://graph.facebook.com/v18.0/${campaign.campaign_id}?fields=effective_status,status,configured_status&access_token=${accessToken}`;
          
          // Call Meta API with cache busting
          const response = await fetch(apiUrl, {
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'X-Request-ID': `bulk-refresh-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            }
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error(`[refresh-campaign-statuses] Meta API error for campaign ${campaign.campaign_id}:`, errorText);
            return {
              campaignId: campaign.campaign_id,
              success: false,
              error: `API error: ${response.status}`
            };
          }
          
          const data = await response.json();
          
          // Prioritize effective_status which gives the real runtime status
          const campaignStatus = data.effective_status || data.configured_status || data.status || 'UNKNOWN';
          
          // Update campaign status in database
          const { error: updateError } = await supabase
            .from('meta_campaigns')
            .update({ 
              status: campaignStatus, 
              last_refresh_date: new Date().toISOString() 
            })
            .eq('campaign_id', campaign.campaign_id)
            .eq('brand_id', brandId);
          
          if (updateError) {
            console.error(`[refresh-campaign-statuses] Error updating campaign ${campaign.campaign_id}:`, updateError);
            return {
              campaignId: campaign.campaign_id,
              success: false,
              error: 'Database update error'
            };
          }
          
          return {
            campaignId: campaign.campaign_id,
            success: true,
            status: campaignStatus
          };
        } catch (error) {
          console.error(`[refresh-campaign-statuses] Error processing campaign ${campaign.campaign_id}:`, error);
          return {
            campaignId: campaign.campaign_id,
            success: false,
            error: (error as Error).message
          };
        }
      });
      
      // Wait for all campaigns in this batch to complete
      const batchResults = await Promise.all(batchPromises);
      refreshResults.push(...batchResults);
      
      // Add a small delay between batches to avoid rate limiting
      if (campaignBatches.indexOf(batch) < campaignBatches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Revalidate related paths to ensure fresh data
    revalidatePath('/dashboard');
    revalidatePath(`/dashboard/${brandId}`);
    
    const successCount = refreshResults.filter(r => r.success).length;
    
    return NextResponse.json({
      success: true,
      message: `Refreshed statuses for ${successCount} out of ${campaigns.length} campaigns`,
      refreshedCount: successCount,
      totalCount: campaigns.length,
      details: refreshResults
    });
  } catch (error) {
    console.error('[refresh-campaign-statuses] Server error:', error);
    return NextResponse.json(
      { error: 'Server error', details: (error as Error).message },
      { status: 500 }
    );
  }
} 