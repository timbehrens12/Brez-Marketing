 import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'
import { fetchMetaCampaignBudgets } from '@/lib/services/meta-service'

export const dynamic = 'force-dynamic'

/**
 * API endpoint to get current budgets for all Meta campaigns
 * This always returns the most up-to-date budget values directly from the database
 */
// Support both GET and POST to bypass caching issues
export async function GET(request: NextRequest) {
  return handleBudgetRequest(request);
}

export async function POST(request: NextRequest) {
  return handleBudgetRequest(request);
}

async function handleBudgetRequest(request: NextRequest) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get brandId from query parameters
    const url = new URL(request.url)
    const brandId = url.searchParams.get('brandId')
    const forceRefresh = url.searchParams.get('forceRefresh') === 'true'
    
    // Log request method for debugging
    console.log(`[Campaign Budget API] 🔍 ${request.method} request received for brandId: ${brandId}`)
    console.log(`[Campaign Budget API] 🚀 START - brandId: ${brandId}, forceRefresh: ${forceRefresh}`)
    
    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    console.log(`[API] Fetching campaign budgets for brand ${brandId}, force refresh: ${forceRefresh}`)
    
    // Initialize Supabase client for fallback
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // 🔥 FORCE REFRESH: Always use Meta API when forceRefresh=true (like Total Budget API)
    console.log(`[Campaign Budget API] 🔍 FORCE REFRESH CHECK: forceRefresh=${forceRefresh}, method=${request.method}`);
    if (forceRefresh) {
      console.log(`[Campaign Budget API] 🔥 forceRefresh=true - bypassing database and fetching fresh Meta API data`);
      
      // Import the Meta budget fetching function
      const { fetchMetaCampaignBudgets } = await import('@/lib/services/meta-service');
      
      try {
        const metaResult = await fetchMetaCampaignBudgets(brandId, true);
        
        if (metaResult.success && metaResult.budgets && metaResult.budgets.length > 0) {
          // Check if Meta API returns non-zero budgets
          const hasNonZeroBudgets = metaResult.budgets.some((budget: any) => budget.budget > 0);
          
          if (hasNonZeroBudgets) {
            console.log(`[Campaign Budget API] ✅ Meta API forceRefresh success - returning fresh data`);
            return NextResponse.json({
              success: true,
              message: 'Campaign budgets fetched from Meta API (forceRefresh)',
              budgets: metaResult.budgets,
              timestamp: new Date().toISOString(),
              refreshMethod: 'meta-api-force-refresh'
            });
          } else {
            console.log(`[Campaign Budget API] ⚠️ Meta API returned $0 budgets during forceRefresh - will fetch fresh adset data`);
          }
        } else {
          console.log(`[Campaign Budget API] ⚠️ Meta API failed during forceRefresh - falling back to fresh adset data fetch`);
        }
      } catch (metaError) {
        console.error(`[Campaign Budget API] ❌ Meta API error during forceRefresh:`, metaError);
        console.log(`[Campaign Budget API] 📊 Will try fresh insights sync instead`);
      }

      // 🔥 CONSOLIDATED FALLBACK: Always try fresh insights sync when forceRefresh=true
      // This handles both $0 budget cases and rate limit cases
      console.log(`[Campaign Budget API] 🔄 forceRefresh fallback - fetching fresh Meta insights to update adset data`);
      console.log(`[Campaign Budget API] 🚨 This will sync fresh adset statuses and budgets from Meta API`);
      try {
        const { fetchMetaAdInsights } = await import('@/lib/services/meta-service');
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        
        // Fetch fresh insights for the last 2 days to update adset statuses and budgets
        await fetchMetaAdInsights(brandId, yesterday, today, false, true);
        console.log(`[Campaign Budget API] ✅ Fresh Meta insights fetched, adset data should now be updated`);
        console.log(`[Campaign Budget API] 🔄 Database should now have correct adset statuses and budgets`);
      } catch (insightsError) {
        console.error(`[Campaign Budget API] ❌ Error fetching fresh Meta insights:`, insightsError);
        console.log(`[Campaign Budget API] ⚠️ Proceeding with database aggregation using existing data`);
      }
    }

    // Check if we need to refresh based on data freshness (only when not forceRefresh)
    let shouldFetchFromMeta = false;
    
    if (!forceRefresh) {
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
        
          // If data is older than 2 minutes, fetch fresh data (aggressive refresh due to caching issues)
          if (minutesSinceUpdate > 2) {
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
          console.log(`[Campaign Budget API] 🔄 Fetching fresh budget data from Meta API (forceRefresh: ${forceRefresh}, shouldFetch: ${shouldFetchFromMeta})`)
          const result = await fetchMetaCampaignBudgets(brandId, true)
          console.log(`[Campaign Budget API] 📊 Meta API result:`, { success: result.success, budgetCount: result.budgets?.length || 0 })
        
        if (result.success && result.budgets && result.budgets.length > 0) {
          // 🚨 CHECK: If Meta API returns $0 budgets, this means budgets are at adset level, not campaign level
          const hasNonZeroBudgets = result.budgets.some((budget: any) => budget.budget > 0)
          
        if (hasNonZeroBudgets) {
          console.log(`[API] ✅ Meta API succeeded with non-zero budgets, returning fresh budget data:`, result.budgets)
          // 🔍 DEBUG: Log each budget value
          result.budgets.forEach((budget: any) => {
            console.log(`[API] 🔍 Meta API budget - campaign: ${budget.campaign_id}, budget: ${budget.budget}, source: ${budget.budget_source}`)
          })
          const response = NextResponse.json({
            success: true,
            message: 'Campaign budgets fetched successfully',
            budgets: result.budgets,
            timestamp: new Date().toISOString(),
            refreshMethod: 'meta-api',
            _nocache: Date.now()
          })
          
          // Prevent 304 responses
          response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
          response.headers.set('Pragma', 'no-cache')
          response.headers.set('Expires', '0')
          response.headers.set('Vary', '*')
          
          return response
          } else {
            console.warn(`[API] Meta API returned all $0 budgets - budgets are likely at adset level, falling back to adset aggregation`)
            console.log(`[API] 🔍 About to query database fallback for brandId: ${brandId}, forceRefresh: ${forceRefresh}`)
          }
        } else {
          console.warn(`[API] Meta API failed or returned empty data, falling back to database:`, result)
        }
      } else {
        console.log(`[Campaign Budget API] 📊 Using database data (fresh enough)`)
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
    
          // Get adsets for these campaigns and aggregate their budgets (EXACT SAME QUERY AS TOTAL BUDGET API)
          // Using the exact same query pattern as Total Budget API for consistency
          console.log(`[Campaign Budget API] 🔍 Querying adsets for campaigns: ${campaignIds}`);
          const { data: adsets, error: adsetsError } = await supabase
            .from('meta_adsets')
            .select('adset_id, adset_name, campaign_id, status, budget, budget_type, updated_at')
            .eq('brand_id', brandId)
            .in('campaign_id', campaignIds)
            .eq('status', 'ACTIVE') // Only get ACTIVE ad sets (same as Total Budget API)
            .order('updated_at', { ascending: false }) // Get most recent data first
    
    if (adsetsError) {
      console.error(`[API] Database fallback failed (adsets):`, adsetsError)
      return NextResponse.json({ 
        error: 'Failed to fetch adsets from database', 
        details: adsetsError.message 
      }, { status: 500 })
    }
    
          // 🔍 DEBUG: Add comprehensive debugging with timestamps
          console.log(`[API] Found ${adsets?.length || 0} active adsets for campaigns: ${campaignIds}`)
          console.log(`[API] Campaigns found:`, campaigns.map(c => `${c.campaign_name} (${c.campaign_id})`))
          console.log(`[API] 🕒 Current time: ${new Date().toISOString()}`)
          console.log(`[API] Adsets found:`, adsets?.map(a => `${a.adset_name} (${a.campaign_id}) - $${a.budget} [updated: ${a.updated_at}]`) || [])
    
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
    
    // 🔍 DEBUG: Check if database data seems stale
    const totalBudgetFromAdsets = Object.values(budgets).reduce((sum, budget) => sum + budget.total, 0)
    const adsetCount = Object.values(budgets).reduce((sum, budget) => sum + budget.count, 0)
    
    console.log(`[Campaign Budget API] 📊 Database aggregation result: $${totalBudgetFromAdsets} from ${adsetCount} adsets`)
    
    // If we get $0 but there are adsets, the database is likely stale
    if (totalBudgetFromAdsets === 0 && adsetCount > 0) {
      console.warn(`[Campaign Budget API] 🚨 STALE DATA DETECTED: Found ${adsetCount} adsets but $0 budget - database is stale`)
      console.warn(`[Campaign Budget API] 💡 Background sync will update this data soon`)
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
    
    console.log(`[Campaign Budget API] 📤 RETURNING database aggregated budgets:`, formattedBudgets)
    // 🔍 DEBUG: Log each formatted budget
    formattedBudgets.forEach(budget => {
      console.log(`[Campaign Budget API] 🔍 Final budget - campaign: ${budget.campaign_id}, budget: $${budget.budget}, formatted: ${budget.formatted_budget}, adsets: ${budget.adset_count}`)
    })
    
      const response = NextResponse.json({
        success: true,
        message: 'Campaign budgets fetched from database',
        budgets: formattedBudgets, // Array format expected by CampaignWidget
        timestamp: new Date().toISOString(),
        refreshMethod: 'database-fallback',
        _nocache: Date.now() // Add timestamp to response body to ensure uniqueness
      })
      
      // Set aggressive no-cache headers to prevent 304 responses
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
      response.headers.set('Pragma', 'no-cache')
      response.headers.set('Expires', '0')
      response.headers.set('X-Content-Type-Options', 'nosniff')
      response.headers.set('Vary', '*') // Tell proxies not to cache
      
      return response
    
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