/**
 * API Route: /api/meta/campaigns/bulk-data
 * 
 * This endpoint returns all campaigns with metrics filtered and calculated for the specified date range
 * Used for immediate accurate data display in the campaign widget
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// Define interfaces for type safety
interface InsightMetrics {
  date: string;
  spent: number;
  impressions: number;
  clicks: number;
  conversions: number;
  reach: number;
  [key: string]: any; // For any other fields that might be present
}

interface MetricsAccumulator {
  spent: number;
  impressions: number;
  clicks: number;
  conversions: number;
  reach: number;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const brandId = url.searchParams.get('brandId');
    const fromDate = url.searchParams.get('from');
    const toDate = url.searchParams.get('to');
    const timestampParam = url.searchParams.get('t'); // Used to bypass cache
    
    if (!brandId) {
      return NextResponse.json(
        { error: 'Missing required parameter: brandId' },
        { status: 400 }
      );
    }
    
    if (!fromDate || !toDate) {
      return NextResponse.json(
        { error: 'Missing required date parameters: from and to' },
        { status: 400 }
      );
    }
    
    const supabase = createClient();
    
    // Fetch all campaigns with their daily insights for this brand
    const { data: campaigns, error } = await supabase
      .from('meta_campaigns')
      .select(`
        *,
        daily_insights(*)
      `)
      .eq('brand_id', brandId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching campaigns:', error);
      return NextResponse.json(
        { error: 'Failed to fetch campaigns', details: error.message },
        { status: 500 }
      );
    }
    
    if (!campaigns || !Array.isArray(campaigns)) {
      return NextResponse.json(
        { error: 'No campaigns found' },
        { status: 404 }
      );
    }
    
    // Apply date filtering and recalculate metrics for each campaign
    const processedCampaigns = campaigns.map(campaign => {
      // Deep clone to avoid reference issues
      const campaignCopy = { ...campaign };
      
      // Process daily insights if they exist
      if (campaign.daily_insights && Array.isArray(campaign.daily_insights)) {
        // Filter insights within the date range
        const filteredInsights = campaign.daily_insights.filter((insight: InsightMetrics) => {
          const insightDate = insight.date;
          return insightDate >= fromDate && insightDate <= toDate;
        });
        
        // Set flag based on whether there's data in the range
        campaignCopy.has_data_in_range = filteredInsights.length > 0;
        
        // Calculate metrics based on filtered insights
        if (filteredInsights.length > 0) {
          const metrics = filteredInsights.reduce((acc: MetricsAccumulator, insight: InsightMetrics) => {
            acc.spent += (insight.spent || 0);
            acc.impressions += (insight.impressions || 0);
            acc.clicks += (insight.clicks || 0);
            acc.conversions += (insight.conversions || 0);
            acc.reach += (insight.reach || 0);
            return acc;
          }, { spent: 0, impressions: 0, clicks: 0, conversions: 0, reach: 0 });
          
          // Update campaign metrics
          campaignCopy.spent = metrics.spent;
          campaignCopy.impressions = metrics.impressions;
          campaignCopy.clicks = metrics.clicks;
          campaignCopy.conversions = metrics.conversions;
          campaignCopy.reach = metrics.reach;
          
          // Calculate derived metrics
          if (metrics.impressions > 0) {
            campaignCopy.ctr = (metrics.clicks / metrics.impressions) * 100;
          } else {
            campaignCopy.ctr = 0;
          }
          
          if (metrics.clicks > 0) {
            campaignCopy.cpc = metrics.spent / metrics.clicks;
          } else {
            campaignCopy.cpc = 0;
          }
          
          if (metrics.conversions > 0) {
            campaignCopy.cost_per_conversion = metrics.spent / metrics.conversions;
          } else {
            campaignCopy.cost_per_conversion = 0;
          }
          
          // Calculate ROAS using a standard conversion value estimate
          const conversionValue = metrics.conversions * 25; // Assuming $25 avg value
          if (metrics.spent > 0) {
            campaignCopy.roas = conversionValue / metrics.spent;
          } else {
            campaignCopy.roas = 0;
          }
        } else {
          // No data in range, zero out metrics
          campaignCopy.spent = 0;
          campaignCopy.impressions = 0;
          campaignCopy.clicks = 0;
          campaignCopy.conversions = 0;
          campaignCopy.reach = 0;
          campaignCopy.ctr = 0;
          campaignCopy.cpc = 0;
          campaignCopy.cost_per_conversion = 0;
          campaignCopy.roas = 0;
        }
        
        // Update daily insights (optional)
        campaignCopy.daily_insights = filteredInsights;
      } else {
        // If no daily insights, set default values
        campaignCopy.has_data_in_range = false;
        campaignCopy.spent = 0;
        campaignCopy.impressions = 0;
        campaignCopy.clicks = 0;
        campaignCopy.conversions = 0;
        campaignCopy.reach = 0;
        campaignCopy.ctr = 0;
        campaignCopy.cpc = 0;
        campaignCopy.cost_per_conversion = 0;
        campaignCopy.roas = 0;
      }
      
      return campaignCopy;
    });
    
    return NextResponse.json({
      success: true,
      campaigns: processedCampaigns,
      count: processedCampaigns.length,
      dateRange: { from: fromDate, to: toDate },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error in bulk campaign data endpoint:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 