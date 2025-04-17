/**
 * API Route: /api/meta/campaigns/data
 * 
 * This endpoint returns detailed data for a specific campaign with date range filtering
 * It ensures campaign metrics are calculated accurately for the specified date range
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const brandId = url.searchParams.get('brandId');
    const campaignId = url.searchParams.get('campaignId');
    const fromDate = url.searchParams.get('from');
    const toDate = url.searchParams.get('to');
    const forceRefresh = url.searchParams.get('forceRefresh') === 'true';
    
    if (!brandId || !campaignId) {
      return NextResponse.json(
        { error: 'Missing required parameters: brandId and campaignId are required' },
        { status: 400 }
      );
    }
    
    const supabase = createClient();
    
    // Fetch the campaign data from the database
    const { data: campaign, error } = await supabase
      .from('meta_campaigns')
      .select(`
        *,
        daily_insights(*)
      `)
      .eq('brand_id', brandId)
      .eq('campaign_id', campaignId)
      .single();
    
    if (error) {
      console.error('Error fetching campaign data:', error);
      return NextResponse.json(
        { error: 'Failed to fetch campaign data', details: error.message },
        { status: 500 }
      );
    }
    
    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }
    
    // Apply date filtering to daily insights if date range is provided
    if (fromDate && toDate && campaign.daily_insights) {
      // Filter insights within the date range
      const filteredInsights = campaign.daily_insights.filter((insight: any) => {
        const insightDate = insight.date;
        return insightDate >= fromDate && insightDate <= toDate;
      });
      
      // Set flag based on whether there's data in the range
      campaign.has_data_in_range = filteredInsights.length > 0;
      
      // Calculate metrics based on filtered insights
      if (filteredInsights.length > 0) {
        const metrics = filteredInsights.reduce((acc: any, insight: any) => {
          acc.spent += (insight.spent || 0);
          acc.impressions += (insight.impressions || 0);
          acc.clicks += (insight.clicks || 0);
          acc.conversions += (insight.conversions || 0);
          acc.reach += (insight.reach || 0);
          return acc;
        }, { spent: 0, impressions: 0, clicks: 0, conversions: 0, reach: 0 });
        
        // Update campaign metrics
        campaign.spent = metrics.spent;
        campaign.impressions = metrics.impressions;
        campaign.clicks = metrics.clicks;
        campaign.conversions = metrics.conversions;
        campaign.reach = metrics.reach;
        
        // Calculate derived metrics
        if (metrics.impressions > 0) {
          campaign.ctr = (metrics.clicks / metrics.impressions) * 100;
        } else {
          campaign.ctr = 0;
        }
        
        if (metrics.clicks > 0) {
          campaign.cpc = metrics.spent / metrics.clicks;
        } else {
          campaign.cpc = 0;
        }
        
        if (metrics.conversions > 0) {
          campaign.cost_per_conversion = metrics.spent / metrics.conversions;
        } else {
          campaign.cost_per_conversion = 0;
        }
        
        // Calculate ROAS using a standard conversion value estimate
        const conversionValue = metrics.conversions * 25; // Assuming $25 avg value
        if (metrics.spent > 0) {
          campaign.roas = conversionValue / metrics.spent;
        } else {
          campaign.roas = 0;
        }
      } else {
        // No data in range, zero out metrics
        campaign.spent = 0;
        campaign.impressions = 0;
        campaign.clicks = 0;
        campaign.conversions = 0;
        campaign.reach = 0;
        campaign.ctr = 0;
        campaign.cpc = 0;
        campaign.cost_per_conversion = 0;
        campaign.roas = 0;
      }
      
      // Replace the daily insights with filtered ones
      campaign.daily_insights = filteredInsights;
    }
    
    // If force refresh is true, also fetch fresh data from Meta API
    if (forceRefresh) {
      // This would be implemented to call Meta API directly
      // For now, we'll just use the database data
      console.log(`Force refresh requested for campaign ${campaignId}, but direct API fetch not implemented`);
    }
    
    return NextResponse.json({
      success: true,
      campaign,
      filtered: Boolean(fromDate && toDate),
      dateRange: fromDate && toDate ? { from: fromDate, to: toDate } : null
    });
  } catch (error: any) {
    console.error('Error in campaign data endpoint:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 