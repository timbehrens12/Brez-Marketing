import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

/**
 * API route for directly checking campaign status from Meta
 * This enables immediate status updates instead of waiting for the sync process
 */
export async function POST(request: NextRequest) {
  try {
    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );
    
    const data = await request.json();
    const silent = data.silent || false; // Whether to log verbose messages
    
    // Validate required parameters
    if (!data.brandId) {
      return NextResponse.json(
        { error: "brandId is required" },
        { status: 400 }
      );
    }
    
    if (!data.campaignId) {
      return NextResponse.json(
        { error: "campaignId is required" },
        { status: 400 }
      );
    }
    
    // Get connection details
    const { data: connectionData, error: connectionError } = await supabase
      .from("platform_connections")
      .select("*")
      .eq("brand_id", data.brandId)
      .eq("platform_type", "meta")
      .eq("status", "active")
      .single();
    
    if (connectionError || !connectionData) {
      console.error("Error fetching Meta connection:", connectionError);
      return NextResponse.json(
        { error: "No active Meta connection found" },
        { status: 400 }
      );
    }
    
    // Fetch campaign directly from Meta API
    let campaignStatus = null;
    
    try {
      // Make direct API call to Meta to get current campaign status
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${data.campaignId}?` +
        `fields=status,effective_status,name,configured_status&` +
        `access_token=${connectionData.access_token}`
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Meta API error:", errorData);
        return NextResponse.json(
          { error: "Failed to fetch campaign from Meta API" },
          { status: 500 }
        );
      }
      
      const campaign = await response.json();
      
      if (campaign && campaign.status) {
        // Use the most relevant status field
        // effective_status is the actual runtime status
        campaignStatus = campaign.effective_status || campaign.status;
        
        if (!silent) {
          console.log(`Campaign ${data.campaignId} current status: ${campaignStatus}`);
        }
        
        // Update the status in database to keep it in sync
        const { error: updateError } = await supabase
          .from("meta_campaigns")
          .update({ 
            status: campaignStatus, 
            last_refresh_date: new Date().toISOString() 
          })
          .eq("campaign_id", data.campaignId)
          .eq("brand_id", data.brandId);
        
        if (updateError) {
          console.warn("Failed to update campaign status in database:", updateError);
        } else if (!silent) {
          console.log(`Updated campaign ${data.campaignId} status in database to ${campaignStatus}`);
        }
      }
    } catch (apiError) {
      console.error("Error fetching campaign from Meta API:", apiError);
      
      // Try to get the status from the database as fallback
      const { data: campaignData, error: campaignError } = await supabase
        .from("meta_campaigns")
        .select("status")
        .eq("campaign_id", data.campaignId)
        .eq("brand_id", data.brandId)
        .single();
      
      if (!campaignError && campaignData) {
        campaignStatus = campaignData.status;
        if (!silent) {
          console.log(`Using fallback status from database: ${campaignStatus}`);
        }
      } else {
        return NextResponse.json(
          { error: "Failed to fetch campaign status" },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json({
      status: campaignStatus,
      campaignId: data.campaignId,
      brandId: data.brandId,
      timestamp: new Date().toISOString(),
      message: "Campaign status fetched directly from Meta API",
      silent: silent
    });
    
  } catch (error) {
    console.error("Error checking campaign status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 