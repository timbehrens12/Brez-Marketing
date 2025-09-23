import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'
import { fetchMetaCampaignBudgets } from '@/lib/services/meta-service'

export const dynamic = 'force-dynamic'

/**
 * API endpoint to get current budgets for all Meta campaigns
 * This always returns the most up-to-date budget values directly from the database
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get brandId from query parameters
    const url = new URL(request.url)
    const brandId = url.searchParams.get('brandId')
    const forceRefresh = url.searchParams.get('forceRefresh') === 'true'
    
    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    console.log(`[API] Fetching campaign budgets for brand ${brandId}, force refresh: ${forceRefresh}`)
    
    // Get real-time budget data from Meta API
    const result = await fetchMetaCampaignBudgets(brandId, true)
    
    if (!result.success) {
      console.error(`[API] Error fetching campaign budgets:`, result.error)
      
      // 🚨 RATE LIMIT FALLBACK: If Meta API fails, try database fallback
      if (result.error?.includes('User request limit reached') || result.error?.includes('rate limit')) {
        console.log('[API] Rate limit detected - falling back to database budget data')
        
        // Initialize Supabase client
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        
        // Get budget data from database
        const { data: campaigns, error: campaignError } = await supabase
          .from('meta_campaigns')
          .select('campaign_id, campaign_name, budget, adset_budget_total, budget_type, updated_at')
          .eq('brand_id', brandId)
          .eq('status', 'ACTIVE');
        
        if (!campaignError && campaigns && campaigns.length > 0) {
          // Transform database data to match expected format
          const budgets = campaigns.reduce((acc: any, campaign: any) => {
            const budget = campaign.adset_budget_total || campaign.budget || 0;
            if (budget > 0) {
              acc[campaign.campaign_id] = {
                campaignId: campaign.campaign_id,
                campaignName: campaign.campaign_name,
                budget: budget,
                budgetType: campaign.budget_type || 'daily',
                updatedAt: campaign.updated_at
              };
            }
            return acc;
          }, {});
          
          console.log(`[API] Database fallback successful - found ${Object.keys(budgets).length} campaigns with budgets`);
          
          return NextResponse.json({
            success: true,
            message: 'Campaign budgets fetched from database (Meta API rate limited)',
            budgets: budgets,
            timestamp: new Date().toISOString(),
            refreshMethod: 'database-fallback'
          });
        }
      }
      
      return NextResponse.json({ 
        error: 'Failed to fetch campaign budgets', 
        details: result.error 
      }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      message: 'Campaign budgets fetched successfully',
      budgets: result.budgets,
      timestamp: new Date().toISOString(),
      refreshMethod: 'meta-api'
    })
    
  } catch (error) {
    console.error('Error fetching campaign budgets:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch campaign budgets', 
      details: typeof error === 'object' && error !== null && 'message' in error 
        ? (error.message as string) 
        : 'Unknown error' 
    }, { status: 500 })
  }
} 