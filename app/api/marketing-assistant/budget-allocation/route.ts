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
    const platforms = searchParams.get('platforms')?.split(',') || ['meta', 'google', 'tiktok']
    const status = searchParams.get('status') || 'active'
    
    // TESTING: Using Sept 16-23 instead of last 7 days
    const sevenDaysAgo = '2024-09-16'
    const today = '2024-09-23'

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    console.log(`🔍 BUDGET DEBUG: Querying for brand ${brandId}`)
    console.log(`🔍 BUDGET DEBUG: Platforms filter:`, platforms)
    console.log(`🔍 BUDGET DEBUG: Status filter:`, status)
    console.log(`🔍 BUDGET DEBUG: Using fixed 7-day window: ${sevenDaysAgo} to ${today}`)
    console.log(`🔍 BUDGET DEBUG: Starting campaign data fetch...`)

    // First, get campaign metadata to filter by platform and status
    // For now, we only support Meta campaigns
    let campaignMetadata: any = {}
    if (platforms.includes('meta')) {
      console.log(`🔍 BUDGET DEBUG: Fetching Meta campaign metadata...`)
      let statusFilter = status
      
      // Map UI status to Meta API statuses
      if (status === 'active') {
        statusFilter = 'ACTIVE'
      } else if (status === 'paused') {
        statusFilter = 'PAUSED'
      }
      
      let metaCampaignsQuery = supabase
        .from('meta_campaigns')
        .select('campaign_id, campaign_name, status')
        .eq('brand_id', brandId)
      
      // Apply status filter - be flexible with status matching
      if (status === 'active') {
        // Match ACTIVE or any status containing 'ACTIVE'
        metaCampaignsQuery = metaCampaignsQuery.or('status.eq.ACTIVE,status.ilike.%ACTIVE%')
      } else if (status === 'paused') {
        // Match PAUSED or any status containing 'PAUSED'
        metaCampaignsQuery = metaCampaignsQuery.or('status.eq.PAUSED,status.ilike.%PAUSED%')
      }
      // 'all' status - no filter
      
      const { data: metaCampaigns, error: metaError } = await metaCampaignsQuery
      
      console.log(`🔍 BUDGET DEBUG: Query results - campaigns found:`, metaCampaigns?.length || 0)
      if (metaCampaigns && metaCampaigns.length > 0) {
        console.log(`🔍 BUDGET DEBUG: Sample campaign:`, {
          name: metaCampaigns[0].campaign_name,
          status: metaCampaigns[0].status,
          id: metaCampaigns[0].campaign_id?.slice(0, 8)
        })
      }
      
      if (metaError) {
        console.error(`🔍 BUDGET DEBUG: Error fetching Meta campaigns:`, metaError)
      } else {
        console.log(`🔍 BUDGET DEBUG: Found ${metaCampaigns?.length || 0} Meta campaigns matching filter`)
        metaCampaigns?.forEach((c: any) => {
          campaignMetadata[c.campaign_id] = {
            name: c.campaign_name,
            status: c.status,
            platform: 'meta'
          }
        })
      }
    }
    
    // Get allowed campaign IDs based on filters
    const allowedCampaignIds = Object.keys(campaignMetadata)
    console.log(`🔍 BUDGET DEBUG: Allowed campaign IDs after filtering:`, allowedCampaignIds.length)
    
    if (allowedCampaignIds.length === 0) {
      console.log(`🔍 BUDGET DEBUG: No campaigns match filters, returning empty`)
      return NextResponse.json({ allocations: [] })
    }

    // Get campaign performance data for budget allocation analysis
    // Always use last 7 days
    let campaignStats = null

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
      .in('campaign_id', allowedCampaignIds)
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
        .in('campaign_id', allowedCampaignIds)
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
        .in('campaign_id', allowedCampaignIds)
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
      
      const metadata = campaignMetadata[campaign.campaign_id] || {}
      
      return {
        id: campaign.campaign_id,
        campaignName: metadata.name || `Campaign ${campaign.campaign_id.slice(0, 8)}`,
        platform: metadata.platform || 'meta',
        status: metadata.status || 'UNKNOWN',
        currentBudget: Math.round(avgDailySpend),
        suggestedBudget,
        currentRoas: Number(currentRoas.toFixed(2)),
        projectedRoas: Number(projectedRoas.toFixed(2)),
        confidence,
        risk
      }
    })
    
    console.log(`🔍 BUDGET DEBUG: Generated ${Object.values(campaignGroups).length} raw allocations`)
    console.log(`🔍 BUDGET DEBUG: Sample raw campaign data:`, Object.values(campaignGroups).length > 0 ? {
      campaign_id: (Object.values(campaignGroups)[0] as any).campaign_id?.slice(0, 8),
      totalSpend: (Object.values(campaignGroups)[0] as any).totalSpend,
      totalRevenue: (Object.values(campaignGroups)[0] as any).totalRevenue,
      totalConversions: (Object.values(campaignGroups)[0] as any).totalConversions,
      days: (Object.values(campaignGroups)[0] as any).days
    } : 'No campaigns')
    
    console.log(`🔍 BUDGET DEBUG: All allocations before filter:`, allocations.map((a: any) => ({
      id: a.id.slice(0, 8),
      name: a.campaignName,
      currentBudget: a.currentBudget,
      suggestedBudget: a.suggestedBudget,
      difference: Math.abs(a.suggestedBudget - a.currentBudget),
      currentRoas: a.currentRoas,
      projectedRoas: a.projectedRoas
    })))
    
    // Show ALL campaigns with spend, even if no budget change is recommended
    const filteredAllocations = allocations.filter((allocation: any) => {
      const passes = allocation.currentBudget > 0.10
      
      if (!passes) {
        console.log(`🔍 BUDGET DEBUG: Filtered out campaign ${allocation.id.slice(0, 8)}: currentBudget too low (${allocation.currentBudget})`)
      }
      
      return passes
    }).sort((a: any, b: any) => {
      // Sort by biggest budget change first, then by confidence
      const diffA = Math.abs(a.suggestedBudget - a.currentBudget)
      const diffB = Math.abs(b.suggestedBudget - b.currentBudget)
      if (diffB !== diffA) return diffB - diffA
      return b.confidence - a.confidence
    })

    console.log(`🔍 BUDGET DEBUG: After filtering: ${filteredAllocations.length} allocations`)
    console.log(`Budget allocation: Returning ${filteredAllocations.length} allocation opportunities`)

    return NextResponse.json({ allocations: filteredAllocations })

  } catch (error) {
    console.error('Error fetching budget allocations:', error)
    return NextResponse.json({ error: 'Failed to fetch budget allocations' }, { status: 500 })
  }
}
