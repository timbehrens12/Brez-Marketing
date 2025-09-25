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
    
    // Initialize Supabase client for fallback
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // Check if we need to refresh based on data freshness
    let shouldFetchFromMeta = forceRefresh;
    
    if (!shouldFetchFromMeta) {
      // Check when we last updated campaign budgets
      const { data: lastUpdateCheck } = await supabase
        .from('meta_adsets')
        .select('updated_at')
        .eq('brand_id', brandId)
        .eq('status', 'ACTIVE')
        .order('updated_at', { ascending: false })
        .limit(1);
        
      if (lastUpdateCheck && lastUpdateCheck.length > 0) {
        const lastUpdate = new Date(lastUpdateCheck[0].updated_at);
        const now = new Date();
        const minutesSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60);
        
        // If data is older than 5 minutes, fetch fresh data
        if (minutesSinceUpdate > 5) {
          console.log(`[API] Budget data is ${minutesSinceUpdate.toFixed(1)} minutes old, fetching fresh data from Meta API`);
          shouldFetchFromMeta = true;
        } else {
          console.log(`[API] Budget data is fresh (${minutesSinceUpdate.toFixed(1)} minutes old), using database`);
        }
      } else {
        console.log(`[API] No recent budget data found, fetching from Meta API`);
        shouldFetchFromMeta = true;
      }
    }

    try {
      // META API FIRST: Fetch real budget data when requested or when data is stale
      if (shouldFetchFromMeta) {
        console.log(`[API] Fetching fresh budget data from Meta API (forceRefresh: ${forceRefresh}, shouldFetch: ${shouldFetchFromMeta})`)
        const result = await fetchMetaCampaignBudgets(brandId, true)
        
        if (result.success && result.budgets && result.budgets.length > 0) {
          // 🚨 CHECK: If Meta API returns $0 budgets, this means budgets are at adset level, not campaign level
          const hasNonZeroBudgets = result.budgets.some((budget: any) => budget.budget > 0)
          
          if (hasNonZeroBudgets) {
            console.log(`[API] ✅ Meta API succeeded with non-zero budgets, returning fresh budget data:`, result.budgets)
            // 🔍 DEBUG: Log each budget value
            result.budgets.forEach((budget: any) => {
              console.log(`[API] 🔍 Meta API budget - campaign: ${budget.campaign_id}, budget: ${budget.budget}, source: ${budget.budget_source}`)
            })
            return NextResponse.json({
              success: true,
              message: 'Campaign budgets fetched successfully',
              budgets: result.budgets,
              timestamp: new Date().toISOString(),
              refreshMethod: 'meta-api'
            })
          } else {
            console.warn(`[API] Meta API returned all $0 budgets - budgets are likely at adset level, falling back to adset aggregation`)
            console.log(`[API] 🔍 About to query database fallback for brandId: ${brandId}, forceRefresh: ${forceRefresh}`)
          }
        } else {
          console.warn(`[API] Meta API failed or returned empty data, falling back to database:`, result)
        }
      } else {
        console.log(`[API] Using database data (fresh enough)`)
      }
    } catch (metaError) {
      console.warn(`[API] Meta API error, falling back to database:`, metaError)
    }
    
    // 🚨 FALLBACK: Get budget data from database by aggregating from adsets
    console.log(`[API] Fetching campaign budgets from database (aggregating from adsets)`)
    
    // First get active campaigns
    const { data: campaigns, error: campaignError } = await supabase
      .from('meta_campaigns')
      .select('campaign_id, campaign_name')
      .eq('brand_id', brandId)
      .eq('status', 'ACTIVE')
    
    if (campaignError) {
      console.error(`[API] Database fallback failed (campaigns):`, campaignError)
      return NextResponse.json({ 
        error: 'Failed to fetch campaigns from database', 
        details: campaignError.message 
      }, { status: 500 })
    }
    
    if (!campaigns || campaigns.length === 0) {
      console.log(`[API] No active campaigns found`)
      return NextResponse.json({
        success: true,
        message: 'No active campaigns found',
        budgets: {},
        timestamp: new Date().toISOString(),
        refreshMethod: 'database-fallback'
      })
    }
    
    const campaignIds = campaigns.map(c => c.campaign_id)
    
    // Get adsets for these campaigns and aggregate their budgets (similar to Total Budget API)
    const { data: adsets, error: adsetsError } = await supabase
      .from('meta_adsets')
      .select('campaign_id, budget, budget_type, status, adset_name')
      .eq('brand_id', brandId)
      .in('campaign_id', campaignIds)
      .eq('status', 'ACTIVE')
    
    if (adsetsError) {
      console.error(`[API] Database fallback failed (adsets):`, adsetsError)
      return NextResponse.json({ 
        error: 'Failed to fetch adsets from database', 
        details: adsetsError.message 
      }, { status: 500 })
    }
    
    // 🔍 DEBUG: Add same debugging as Total Budget API
    console.log(`[API] Found ${adsets?.length || 0} active adsets for campaigns: ${campaignIds}`)
    console.log(`[API] Campaigns found:`, campaigns.map(c => `${c.campaign_name} (${c.campaign_id})`))
    console.log(`[API] Adsets found:`, adsets?.map(a => `${a.adset_name} (${a.campaign_id}) - $${a.budget}`) || [])
    
    // Additional debug to check raw adset data
    if (adsets && adsets.length > 0) {
      console.log(`[API] Sample adset data:`)
      adsets.slice(0, 3).forEach(adset => {
        console.log(`  ${adset.adset_name}: campaign=${adset.campaign_id}, budget=${adset.budget}, type=${adset.budget_type}, status=${adset.status}`)
      })
    } else {
      console.warn(`[API] 🚨 NO ADSETS FOUND - this explains why campaign budget is $0`)
      
      // Try a broader query to see what adsets exist
      const { data: debugAdsets, error: debugError } = await supabase
        .from('meta_adsets')
        .select('adset_name, campaign_id, status, budget, budget_type')
        .eq('brand_id', brandId)
        .limit(5)
      
      if (!debugError && debugAdsets) {
        console.log(`[API] 🔍 All adsets for brand (any status):`)
        debugAdsets.forEach(adset => {
          console.log(`  ${adset.adset_name}: campaign=${adset.campaign_id}, status=${adset.status}, budget=$${adset.budget}`)
        })
      }
    }
    
    // Aggregate budgets by campaign (using same logic as Total Budget API)
    const budgets: { [campaignId: string]: { total: number, type: string, count: number } } = {}
    
    // Initialize all campaigns with 0
    campaigns.forEach(campaign => {
      budgets[campaign.campaign_id] = { total: 0, type: 'daily', count: 0 }
    })
    
    // Sum up adset budgets per campaign
    adsets?.forEach(adset => {
      const adsetBudget = parseFloat(adset.budget) || 0
      console.log(`[API] 🔍 Processing adset ${adset.adset_name} - campaign: ${adset.campaign_id}, budget: $${adsetBudget}, type: ${adset.budget_type}, status: ${adset.status}`)
      
      if (adsetBudget > 0) {
        budgets[adset.campaign_id].total += adsetBudget
        budgets[adset.campaign_id].count += 1
        budgets[adset.campaign_id].type = adset.budget_type || 'daily'
        console.log(`[API] 🔍 Added to campaign ${adset.campaign_id}: +$${adsetBudget} = $${budgets[adset.campaign_id].total} (${budgets[adset.campaign_id].count} adsets)`)
      }
    })
    
    console.log(`[API] Aggregated campaign budgets:`, budgets)
    
    // 🔍 DEBUG: Check if any budget is 0 and we should try refreshing from Meta
    const hasZeroBudgets = Object.values(budgets).some(budget => budget.total === 0)
    if (hasZeroBudgets && adsets && adsets.length > 0) {
      console.warn(`[API] 🚨 Found campaigns with $0 budget but adsets exist - database might be stale:`)
      adsets.forEach(adset => {
        console.log(`  Adset: ${adset.adset_name}, Budget: $${adset.budget}, Status: ${adset.status}, Campaign: ${adset.campaign_id}`)
      })
    }
    
    // Format budgets as array of objects to match expected CampaignWidget format
    const formattedBudgets = Object.entries(budgets).map(([campaignId, budget]) => ({
      campaign_id: campaignId,
      budget: budget.total,
      budget_type: budget.type,
      formatted_budget: budget.type === 'daily' 
        ? `$${budget.total.toFixed(2)}/day`
        : `$${budget.total.toFixed(2)}`,
      budget_source: 'database-adsets',
      adset_count: budget.count
    }))
    
    console.log(`[API] Returning database aggregated budgets:`, formattedBudgets)
    // 🔍 DEBUG: Log each formatted budget
    formattedBudgets.forEach(budget => {
      console.log(`[API] 🔍 Database budget - campaign: ${budget.campaign_id}, budget: $${budget.budget}, formatted: ${budget.formatted_budget}, adsets: ${budget.adset_count}`)
    })
    
    return NextResponse.json({
      success: true,
      message: 'Campaign budgets fetched from database',
      budgets: formattedBudgets, // Array format expected by CampaignWidget
      timestamp: new Date().toISOString(),
      refreshMethod: 'database-fallback'
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