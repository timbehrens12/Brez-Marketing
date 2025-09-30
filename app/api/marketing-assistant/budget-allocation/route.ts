import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const brandId = searchParams.get('brandId')
    const platformsParam = searchParams.get('platforms') || 'meta,google,tiktok'
    const statusParam = searchParams.get('status') || 'active'
    
    // Parse platforms
    const platforms = platformsParam.split(',').map(p => p.trim())
    
    // IGNORE frontend date params - always use last 7 days for current performance
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const today = new Date().toISOString().split('T')[0]

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    console.log(`🔍 BUDGET DEBUG: Querying for brand ${brandId}`)
    console.log(`🔍 BUDGET DEBUG: Platforms filter: ${platforms.join(', ')}`)
    console.log(`🔍 BUDGET DEBUG: Status filter: ${statusParam}`)
    console.log(`🔍 BUDGET DEBUG: Using fixed 7-day window: ${sevenDaysAgo} to ${today}`)
    console.log(`🔍 BUDGET DEBUG: Starting campaign data fetch...`)

    // Get campaign performance data for budget allocation analysis
    // Join with meta_campaigns to get status and campaign name
    // Always use last 7 days
    let campaignStats = null

    // First, get active/paused campaigns based on filter
    let campaignStatusQuery = supabase
      .from('meta_campaigns')
      .select('campaign_id, campaign_name, status')
      .eq('brand_id', brandId)
    
    // Apply status filter
    if (statusParam === 'active') {
      campaignStatusQuery = campaignStatusQuery.eq('status', 'ACTIVE')
    } else if (statusParam === 'paused') {
      campaignStatusQuery = campaignStatusQuery.eq('status', 'PAUSED')
    }
    // 'all' means no filter
    
    const { data: campaigns } = await campaignStatusQuery
    console.log(`🔍 BUDGET DEBUG: Found ${campaigns?.length || 0} campaigns with status filter: ${statusParam}`)
    
    if (!campaigns || campaigns.length === 0) {
      console.log(`🔍 BUDGET DEBUG: No campaigns match the status filter`)
      return NextResponse.json({ allocations: [] })
    }
    
    const campaignIds = campaigns.map(c => c.campaign_id)

    const result = await supabase
      .from('meta_campaign_daily_stats')
      .select(`
        campaign_id,
        date,
        spend,
        impressions,
        clicks,
        conversions,
        roas,
        purchase_value
      `)
      .eq('brand_id', brandId)
      .in('campaign_id', campaignIds)
      .gte('date', sevenDaysAgo)
      .lte('date', today)
    
    if (result.error) {
      console.error(`🔍 BUDGET DEBUG: Query error:`, result.error)
    }
    
    campaignStats = result.data
    console.log(`🔍 BUDGET DEBUG: 7-day query result: ${campaignStats?.length || 0} records`)
    console.log(`🔍 BUDGET DEBUG: Sample record:`, campaignStats?.[0] || 'No records')

    // If no data in last 7 days, try last 30 days
    if (!campaignStats || campaignStats.length === 0) {
      console.log(`🔍 BUDGET DEBUG: No 7-day data, trying 30-day fallback...`)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      console.log(`🔍 BUDGET DEBUG: 30-day fallback date: ${thirtyDaysAgo}`)
      const { data: fallbackStats } = await supabase
        .from('meta_campaign_daily_stats')
        .select(`
          campaign_id,
          date,
          spend,
          impressions,
          clicks,
          conversions,
          roas,
          purchase_value
        `)
        .eq('brand_id', brandId)
        .in('campaign_id', campaignIds)
        .gte('date', thirtyDaysAgo)
      
      campaignStats = fallbackStats
      console.log(`🔍 BUDGET DEBUG: 30-day fallback result: ${campaignStats?.length || 0} records`)
      console.log(`🔍 BUDGET DEBUG: 30-day sample:`, campaignStats?.[0] || 'No records')
    }

    // If still no data in 30 days, try ALL historical data
    if (!campaignStats || campaignStats.length === 0) {
      console.log(`🔍 BUDGET DEBUG: No 30-day data, fetching ALL historical data...`)
      const { data: allStats } = await supabase
        .from('meta_campaign_daily_stats')
        .select(`
          campaign_id,
          date,
          spend,
          impressions,
          clicks,
          conversions,
          roas,
          purchase_value
        `)
        .eq('brand_id', brandId)
        .in('campaign_id', campaignIds)
        .order('date', { ascending: false })
        .limit(1000) // Get up to 1000 most recent records
      
      campaignStats = allStats
      console.log(`🔍 BUDGET DEBUG: ALL historical data result: ${campaignStats?.length || 0} records`)
      console.log(`🔍 BUDGET DEBUG: ALL data sample:`, campaignStats?.[0] || 'No records')
    }

    console.log(`🔍 BUDGET DEBUG: FINAL RESULT: ${campaignStats?.length || 0} campaign records for brand ${brandId}`)
    
    // Log total records in database for this brand (to see if data exists at all)
    const { count } = await supabase
      .from('meta_campaign_daily_stats')
      .select('*', { count: 'exact', head: true })
      .eq('brand_id', brandId)
    
    console.log(`🔍 BUDGET DEBUG: Total records in DB for brand ${brandId}: ${count || 0}`)
    
    // Old log for backwards compatibility
    console.log(`Budget allocation: Found ${campaignStats?.length || 0} campaign records for brand ${brandId}`)

    if (!campaignStats || campaignStats.length === 0) {
      return NextResponse.json({ allocations: [] })
    }

    // Group by campaign and calculate totals
    const campaignGroups = campaignStats.reduce((acc: any, stat: any) => {
      const key = stat.campaign_id
      if (!acc[key]) {
        acc[key] = {
          campaign_id: stat.campaign_id,
          totalSpend: 0,
          totalImpressions: 0,
          totalClicks: 0,
          totalConversions: 0,
          totalRevenue: 0,
          days: 0
        }
      }
      
      acc[key].totalSpend += stat.spend || 0
      acc[key].totalImpressions += stat.impressions || 0
      acc[key].totalClicks += stat.clicks || 0
      acc[key].totalConversions += stat.conversions || 0
      acc[key].totalRevenue += stat.purchase_value || (stat.roas * stat.spend) || 0
      acc[key].days++
      
      return acc
    }, {})

    // Create a lookup map for campaign names
    const campaignNameMap = campaigns.reduce((acc: any, c: any) => {
      acc[c.campaign_id] = c.campaign_name
      return acc
    }, {})

    // Generate budget allocation recommendations
    const allocations = Object.values(campaignGroups).map((campaign: any) => {
      const avgDailySpend = campaign.totalSpend / campaign.days
      const currentRoas = campaign.totalSpend > 0 ? campaign.totalRevenue / campaign.totalSpend : 0
      const ctr = campaign.totalImpressions > 0 ? (campaign.totalClicks / campaign.totalImpressions) * 100 : 0
      
      // Calculate efficiency score (CTR * ROAS)
      const efficiency = ctr * currentRoas
      
      // Determine suggested budget changes based on performance
      let budgetMultiplier = 1.0
      let confidence = 50
      let risk: 'low' | 'medium' | 'high' = 'medium'
      
      // Handle campaigns with zero revenue (need tracking setup)
      if (campaign.totalRevenue === 0 && campaign.totalConversions > 0) {
        budgetMultiplier = 0.9 // Slight decrease until tracking is fixed
        confidence = 60
        risk = 'high'
      } else if (currentRoas > 2.5 && efficiency > 5) {
        budgetMultiplier = 1.5 // Increase by 50%
        confidence = 85
        risk = 'low'
      } else if (currentRoas > 1.8 && efficiency > 2) {
        budgetMultiplier = 1.25 // Increase by 25%
        confidence = 75
        risk = 'low'
      } else if (currentRoas > 1.2 && efficiency > 1) {
        budgetMultiplier = 1.1 // Increase by 10%
        confidence = 65
        risk = 'medium'
      } else if (currentRoas > 0.8 && avgDailySpend > 5) {
        budgetMultiplier = 1.05 // Small increase by 5%
        confidence = 60
        risk = 'medium'
      } else if (currentRoas < 0.8 || efficiency < 0.5) {
        budgetMultiplier = 0.8 // Decrease by 20%
        confidence = 70
        risk = 'high'
      } else if (avgDailySpend > 5 && ctr > 1.0) {
        // Campaigns with good engagement but unclear ROAS
        budgetMultiplier = 1.05 // Small test increase
        confidence = 55
        risk = 'medium'
      }
      
      const suggestedBudget = Math.round(avgDailySpend * budgetMultiplier)
      const projectedRoas = currentRoas * (budgetMultiplier <= 1 ? 1.1 : 0.95) // Slight diminishing returns for increases
      
      return {
        id: campaign.campaign_id,
        campaignName: campaignNameMap[campaign.campaign_id] || `Campaign ${campaign.campaign_id.slice(0, 8)}`,
        currentBudget: Math.round(avgDailySpend),
        suggestedBudget,
        currentRoas: Number(currentRoas.toFixed(2)),
        projectedRoas: Number(projectedRoas.toFixed(2)),
        confidence,
        risk
      }
    })
    
    console.log(`🔍 BUDGET DEBUG: Generated ${Object.values(campaignGroups).length} raw allocations`)
    console.log(`🔍 BUDGET DEBUG: Sample allocation before filter:`, Object.values(campaignGroups).length > 0 ? {
      currentBudget: Math.round((Object.values(campaignGroups)[0] as any).totalSpend / (Object.values(campaignGroups)[0] as any).days),
      days: (Object.values(campaignGroups)[0] as any).days,
      totalSpend: (Object.values(campaignGroups)[0] as any).totalSpend
    } : 'No campaigns')
    
    const filteredAllocations = allocations.filter((allocation: any) => 
      // Only show campaigns with any spend and budget differences (lowered threshold to $0.10)
      allocation.currentBudget > 0.10 && 
      Math.abs(allocation.suggestedBudget - allocation.currentBudget) > 0.05
    ).sort((a: any, b: any) => b.confidence - a.confidence) // Sort by confidence

    console.log(`🔍 BUDGET DEBUG: After filtering: ${filteredAllocations.length} allocations`)
    console.log(`Budget allocation: Returning ${filteredAllocations.length} allocation opportunities`)

    return NextResponse.json({ allocations: filteredAllocations })

  } catch (error) {
    console.error('Error fetching budget allocations:', error)
    return NextResponse.json({ error: 'Failed to fetch budget allocations' }, { status: 500 })
  }
}
