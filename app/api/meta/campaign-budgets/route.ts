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
    
    try {
      // 🚨 TEMPORARY: Force database fallback to test if issue is with Meta API
      console.log(`[API] TEMPORARILY FORCING DATABASE FALLBACK FOR TESTING`)
      
      // Try to get real-time budget data from Meta API
      // const result = await fetchMetaCampaignBudgets(brandId, true)
      // 
      // if (result.success) {
      //   return NextResponse.json({
      //     success: true,
      //     message: 'Campaign budgets fetched successfully',
      //     budgets: result.budgets,
      //     timestamp: new Date().toISOString(),
      //     refreshMethod: 'meta-api'
      //   })
      // } else {
      //   console.warn(`[API] Meta API failed, falling back to database:`, result.error)
      // }
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
    
    // Get adsets for these campaigns and aggregate their budgets
    const { data: adsets, error: adsetsError } = await supabase
      .from('meta_adsets')
      .select('campaign_id, budget, status')
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
    
    // Aggregate budgets by campaign
    const budgets: { [campaignId: string]: number } = {}
    
    // Initialize all campaigns with 0
    campaigns.forEach(campaign => {
      budgets[campaign.campaign_id] = 0
    })
    
    // Sum up adset budgets per campaign
    adsets?.forEach(adset => {
      if (adset.budget && adset.budget > 0) {
        budgets[adset.campaign_id] = (budgets[adset.campaign_id] || 0) + adset.budget
      }
    })
    
    console.log(`[API] Aggregated campaign budgets:`, budgets)
    
    // Format budgets as array of objects to match expected CampaignWidget format
    const formattedBudgets = Object.entries(budgets).map(([campaignId, budget]) => ({
      campaign_id: campaignId,
      budget: budget,
      budget_type: 'daily', // Assume daily for database fallback
      formatted_budget: `$${budget.toFixed(2)}`,
      budget_source: 'database-adsets'
    }))
    
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