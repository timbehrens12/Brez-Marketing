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
    const fromDate = searchParams.get('fromDate')
    const toDate = searchParams.get('toDate')

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    console.log(`🔍 BUDGET DEBUG: Querying for brand ${brandId}`)
    console.log(`🔍 BUDGET DEBUG: fromDate = "${fromDate}", toDate = "${toDate}"`)
    console.log(`🔍 BUDGET DEBUG: fromDate type = ${typeof fromDate}, toDate type = ${typeof toDate}`)
    console.log(`🔍 BUDGET DEBUG: Starting campaign data fetch...`)

    // Get campaign performance data for budget allocation analysis
    // Use a broader date range if the specified range returns no data or if dates are null
    let campaignStats = null

    if (fromDate && toDate) {
      // Convert ISO strings to date format for database query
      const fromDateFormatted = fromDate.split('T')[0]
      const toDateFormatted = toDate.split('T')[0]
      
      console.log(`🔍 BUDGET DEBUG: Formatted dates - from: ${fromDateFormatted}, to: ${toDateFormatted}`)
      console.log(`🔍 BUDGET DEBUG: About to query supabase with formatted dates...`)
      
      const result = await supabase
        .from('meta_campaign_daily_stats')
        .select(`
          campaign_id,
          campaign_name,
          spend,
          impressions,
          clicks,
          conversions,
          roas,
          purchase_value
        `)
        .eq('brand_id', brandId)
        .gte('date', fromDateFormatted)
        .lte('date', toDateFormatted)
      
      campaignStats = result.data
      console.log(`🔍 BUDGET DEBUG: Initial query result: ${campaignStats?.length || 0} records`)
      console.log(`🔍 BUDGET DEBUG: Sample record:`, campaignStats?.[0] || 'No records')
    } else {
      console.log(`🔍 BUDGET DEBUG: No dates provided, skipping initial query`)
    }

    // If no data in specified range or no dates provided, try last 30 days
    if (!campaignStats || campaignStats.length === 0) {
      console.log(`🔍 BUDGET DEBUG: No data found, trying 30-day fallback...`)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      console.log(`🔍 BUDGET DEBUG: 30-day fallback date: ${thirtyDaysAgo}`)
      const { data: fallbackStats } = await supabase
        .from('meta_campaign_daily_stats')
        .select(`
          campaign_id,
          campaign_name,
          spend,
          impressions,
          clicks,
          conversions,
          roas,
          purchase_value
        `)
        .eq('brand_id', brandId)
        .gte('date', thirtyDaysAgo)
      
      campaignStats = fallbackStats
      console.log(`🔍 BUDGET DEBUG: 30-day fallback result: ${campaignStats?.length || 0} records`)
      console.log(`🔍 BUDGET DEBUG: 30-day sample:`, campaignStats?.[0] || 'No records')
    }

    // If still no data, try last 90 days
    if (!campaignStats || campaignStats.length === 0) {
      console.log(`🔍 BUDGET DEBUG: Still no data, trying 90-day fallback...`)
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      console.log(`🔍 BUDGET DEBUG: 90-day fallback date: ${ninetyDaysAgo}`)
      const { data: fallbackStats } = await supabase
        .from('meta_campaign_daily_stats')
        .select(`
          campaign_id,
          campaign_name,
          spend,
          impressions,
          clicks,
          conversions,
          roas,
          purchase_value
        `)
        .eq('brand_id', brandId)
        .gte('date', ninetyDaysAgo)
      
      campaignStats = fallbackStats
      console.log(`🔍 BUDGET DEBUG: 90-day fallback result: ${campaignStats?.length || 0} records`)
      console.log(`🔍 BUDGET DEBUG: 90-day sample:`, campaignStats?.[0] || 'No records')
    }

    // If STILL no data, get ALL available data without date restrictions
    if (!campaignStats || campaignStats.length === 0) {
      console.log(`🔍 BUDGET DEBUG: No data in 90 days, fetching ALL historical data...`)
      const { data: allStats } = await supabase
        .from('meta_campaign_daily_stats')
        .select(`
          campaign_id,
          campaign_name,
          spend,
          impressions,
          clicks,
          conversions,
          roas,
          purchase_value
        `)
        .eq('brand_id', brandId)
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
          campaign_name: stat.campaign_name,
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
      
      return {
        id: campaign.campaign_id,
        campaignName: campaign.campaign_name || `Campaign ${campaign.campaign_id}`,
        currentBudget: Math.round(avgDailySpend),
        suggestedBudget,
        currentRoas: Number(currentRoas.toFixed(2)),
        projectedRoas: Number(projectedRoas.toFixed(2)),
        confidence,
        risk
      }
    }).filter((allocation: any) => 
      // Only show campaigns with any spend and budget differences
      allocation.currentBudget > 1 && 
      Math.abs(allocation.suggestedBudget - allocation.currentBudget) > 1
    ).sort((a: any, b: any) => b.confidence - a.confidence) // Sort by confidence

    console.log(`Budget allocation: Returning ${allocations.length} allocation opportunities`)

    return NextResponse.json({ allocations })

  } catch (error) {
    console.error('Error fetching budget allocations:', error)
    return NextResponse.json({ error: 'Failed to fetch budget allocations' }, { status: 500 })
  }
}
