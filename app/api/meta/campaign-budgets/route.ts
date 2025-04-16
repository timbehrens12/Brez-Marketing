/**
 * Campaign Budgets API
 * 
 * This endpoint returns budget information for all campaigns belonging to a brand.
 * It aggregates budget data from both campaign settings and ad sets to provide
 * the most accurate total budget information for each campaign.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const brandId = searchParams.get('brandId');
  const forceRefresh = searchParams.get('forceRefresh') === 'true';
  
  if (!brandId) {
    return NextResponse.json({ 
      error: 'Missing required parameter: brandId is required' 
    }, { status: 400 });
  }
  
  try {
    const supabase = createClient();
    
    // Get the brand to verify access permission
    const { data: brand } = await supabase
      .from('brand')
      .select('id, platform_connections(*)')
      .eq('id', brandId)
      .single();
    
    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }
    
    // Check if brand has Meta connection
    const metaConnection = brand.platform_connections?.find(
      (conn: any) => conn.platform_type === 'meta' && conn.status === 'active'
    );
    
    if (!metaConnection) {
      return NextResponse.json({ error: 'Meta connection not found for this brand' }, { status: 404 });
    }
    
    // Get all campaigns for this brand
    const { data: campaigns, error: campaignError } = await supabase
      .from('meta_campaign')
      .select('id, campaign_id, campaign_name, status, budget, budget_type')
      .eq('brand_id', brandId);
    
    if (campaignError) {
      console.error('Error fetching campaigns:', campaignError);
      return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
    }
    
    // Get ad set budget data for all campaigns
    const { data: adSets, error: adSetError } = await supabase
      .from('meta_adset')
      .select('id, campaign_id, budget, budget_type')
      .eq('brand_id', brandId);
    
    if (adSetError) {
      console.error('Error fetching ad sets:', adSetError);
      // Continue with campaign-only data
    }
    
    // Process the budget data
    const campaignBudgets = (campaigns || []).map(campaign => {
      // Get all ad sets for this campaign
      const campaignAdSets = (adSets || []).filter(adSet => 
        adSet.campaign_id === campaign.campaign_id
      );
      
      // Calculate total ad set budget
      const adSetBudgetTotal = campaignAdSets.reduce((sum, adSet) => 
        sum + (adSet.budget || 0), 0);
      
      // Determine if we should use campaign budget or ad set budgets
      // Use ad set budget total if it's greater than 0 and there are ad sets
      const useCampaignBudget = adSetBudgetTotal === 0 || campaignAdSets.length === 0;
      
      // Determine budget type (if ad sets have mixed types, prioritize daily)
      let effectiveBudgetType = campaign.budget_type || 'unknown';
      
      if (!useCampaignBudget) {
        const hasDaily = campaignAdSets.some(adSet => adSet.budget_type === 'daily');
        effectiveBudgetType = hasDaily ? 'daily' : campaignAdSets[0]?.budget_type || 'unknown';
      }
      
      // Determine the effective budget
      const effectiveBudget = useCampaignBudget ? campaign.budget || 0 : adSetBudgetTotal;
      
      // Format budget for display
      const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 2
        }).format(amount);
      };
      
      return {
        campaign_id: campaign.campaign_id,
        budget: effectiveBudget,
        budget_type: effectiveBudgetType,
        formatted_budget: formatCurrency(effectiveBudget),
        budget_source: useCampaignBudget ? 'campaign' : 'adsets',
        adset_count: campaignAdSets.length
      };
    });
    
    return NextResponse.json({
      budgets: campaignBudgets,
      count: campaignBudgets.length,
      refreshMethod: forceRefresh ? 'force-refresh' : 'standard',
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('Error in campaign budgets API:', error);
    return NextResponse.json({ 
      error: error.message || 'An internal server error occurred' 
    }, { status: 500 });
  }
} 