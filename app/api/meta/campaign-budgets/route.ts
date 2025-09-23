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
      // Try to get real-time budget data from Meta API
      const result = await fetchMetaCampaignBudgets(brandId, true)
      
      if (result.success) {
        return NextResponse.json({
          success: true,
          message: 'Campaign budgets fetched successfully',
          budgets: result.budgets,
          timestamp: new Date().toISOString(),
          refreshMethod: 'meta-api'
        })
      } else {
        console.warn(`[API] Meta API failed, falling back to database:`, result.error)
      }
    } catch (metaError) {
      console.warn(`[API] Meta API error, falling back to database:`, metaError)
    }
    
    // 🚨 FALLBACK: Get budget data from database
    console.log(`[API] Fetching campaign budgets from database`)
    const { data: campaigns, error: campaignError } = await supabase
      .from('meta_campaigns')
      .select('campaign_id, campaign_name, budget, adset_budget_total')
      .eq('brand_id', brandId)
      .eq('status', 'ACTIVE')
    
    if (campaignError) {
      console.error(`[API] Database fallback failed:`, campaignError)
      return NextResponse.json({ 
        error: 'Failed to fetch campaign budgets from database', 
        details: campaignError.message 
      }, { status: 500 })
    }
    
    // Format database data as budgets
    const budgets: { [campaignId: string]: number } = {}
    campaigns?.forEach(campaign => {
      const budget = campaign.adset_budget_total || campaign.budget || 0
      budgets[campaign.campaign_id] = budget
    })
    
    return NextResponse.json({
      success: true,
      message: 'Campaign budgets fetched from database',
      budgets,
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