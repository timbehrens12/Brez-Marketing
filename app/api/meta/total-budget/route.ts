import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
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
    const activeOnly = searchParams.get('activeOnly') === 'true';
    
    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 });
    }
    
    console.log(`[Total Meta Budget] Processing request for brandId=${brandId}, activeOnly=${activeOnly}`);
    
    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );
    
    let adSets = [];
    let adSetsError;
    
    if (activeOnly) {
      // For activeOnly=true, we need to join with campaigns to check both statuses
      console.log(`[Total Meta Budget] Fetching only active ad sets in active campaigns`);
      
      // First, let's check what campaigns are active for debugging
      const { data: activeCampaigns, error: campaignError } = await supabase
        .from('meta_campaigns')
        .select('campaign_id, campaign_name, status')
        .eq('brand_id', brandId)
        .eq('status', 'ACTIVE');
      
      if (campaignError) {
        console.error('[Total Meta Budget] Error fetching active campaigns:', campaignError);
      } else {
        console.log(`[Total Meta Budget] Found ${activeCampaigns?.length || 0} active campaigns`);
        if (activeCampaigns && activeCampaigns.length > 0) {
          console.log('[Total Meta Budget] Active campaigns:', activeCampaigns.map(c => `${c.campaign_name} (${c.campaign_id})`));
        }
      }
      
      // Try a two-step approach instead of a complex join that might not work properly
      // First, get active ad sets
      const { data: activeAdSets, error: adSetsError1 } = await supabase
        .from('meta_adsets')
        .select('*')
        .eq('brand_id', brandId)
        .eq('status', 'ACTIVE');
        
      if (adSetsError1) {
        console.error('[Total Meta Budget] Error fetching active ad sets:', adSetsError1);
        adSetsError = adSetsError1;
      } else if (activeAdSets && activeAdSets.length > 0) {
        console.log(`[Total Meta Budget] Found ${activeAdSets.length} active ad sets before campaign filter`);
        
        // Then, filter these ad sets to only include those in active campaigns
        if (activeCampaigns && activeCampaigns.length > 0) {
          const activeCampaignIds = activeCampaigns.map(c => c.campaign_id);
          
          adSets = activeAdSets.filter(adSet => 
            activeCampaignIds.includes(adSet.campaign_id)
          );
          
          console.log(`[Total Meta Budget] After filtering: ${adSets.length} ad sets in active campaigns`);
          
          if (adSets.length > 0) {
            console.log('[Total Meta Budget] Ad sets in active campaigns:', 
              adSets.map(a => `${a.adset_name} (budget: $${a.budget} ${a.budget_type}, campaign: ${a.campaign_id})`)
            );
          } else {
            console.log('[Total Meta Budget] No ad sets found in active campaigns');
          }
        } else {
          console.log('[Total Meta Budget] No active campaigns found, so no ad sets will be included');
          adSets = [];
        }
      } else {
        console.log('[Total Meta Budget] No active ad sets found');
        adSets = [];
      }
    } else {
      // For non-activeOnly, use the original query
      const { data, error } = await supabase
        .from('meta_adsets')
        .select('budget, budget_type, status, adset_name, campaign_id')
        .eq('brand_id', brandId)
        .in('status', ['ACTIVE', 'PAUSED']);
      
      adSets = data || [];
      adSetsError = error;
    }
    
    if (adSetsError) {
      console.error('Error fetching ad sets:', adSetsError);
      return NextResponse.json(
        { error: 'Failed to fetch ad sets', details: adSetsError.message },
        { status: 500 }
      );
    }
    
    // Calculate total daily budget
    let totalDailyBudget = 0;
    let totalLifetimeBudget = 0;
    
    if (adSets && adSets.length > 0) {
      // Sum up daily budgets
      totalDailyBudget = adSets
        .filter(adSet => adSet.budget_type === 'daily')
        .reduce((sum, adSet) => {
          const budget = parseFloat(adSet.budget) || 0;
          console.log(`[Total Meta Budget] Adding daily budget: $${budget} from ad set ${adSet.adset_name || adSet.id}`);
          return sum + budget;
        }, 0);
      
      // Sum up lifetime budgets
      totalLifetimeBudget = adSets
        .filter(adSet => adSet.budget_type === 'lifetime')
        .reduce((sum, adSet) => {
          const budget = parseFloat(adSet.budget) || 0;
          console.log(`[Total Meta Budget] Adding lifetime budget: $${budget} from ad set ${adSet.adset_name || adSet.id}`);
          return sum + budget;
        }, 0);
    }
    
    console.log(`[Total Meta Budget] Calculated budgets - Daily: $${totalDailyBudget}, Lifetime: $${totalLifetimeBudget}, Total: $${totalDailyBudget + totalLifetimeBudget}, Count: ${adSets?.length || 0}`);
    
    return NextResponse.json(
      { 
        success: true,
        totalDailyBudget,
        totalLifetimeBudget,
        totalBudget: totalDailyBudget + totalLifetimeBudget,
        adSetCount: adSets ? adSets.length : 0,
        dailyBudgetAdSetCount: adSets ? adSets.filter(adSet => adSet.budget_type === 'daily').length : 0,
        lifetimeBudgetAdSetCount: adSets ? adSets.filter(adSet => adSet.budget_type === 'lifetime').length : 0,
        timestamp: new Date().toISOString()
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error in total budget endpoint:', error);
    
    return NextResponse.json(
      { error: 'Failed to calculate total budget', details: error.message },
      { status: 500 }
    );
  }
} 