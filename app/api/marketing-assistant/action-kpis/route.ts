import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const brandId = searchParams.get('brandId')
    const platformsParam = searchParams.get('platforms') || 'meta,google,tiktok'
    const platforms = platformsParam.split(',')

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    console.log('[ACTION KPIs] Calculating for brand:', brandId)
    console.log('[ACTION KPIs] Platforms:', platforms)

    // TESTING: Using Sept 16-23 instead of last 7 days
    const startDateStr = '2024-09-16'
    const endDateStr = '2024-09-23'

    console.log('[ACTION KPIs] Date range:', startDateStr, 'to', endDateStr)

    // Initialize response object
    const actionKPIs = {
      activeCampaigns: 0,
      totalCampaigns: 0,
      budgetUtilization: 0,
      topPerformer: null as { name: string; roas: number; spend: number } | null,
      needsAttention: 0
    }

    // Only Meta data is available currently
    if (platforms.includes('meta')) {
      // 1. Get all campaigns for this brand
      const { data: allCampaigns, error: campaignsError } = await supabase
        .from('meta_campaigns')
        .select('campaign_id, campaign_name, status, budget, budget_type')
        .eq('brand_id', brandId)

      if (campaignsError) {
        console.error('[ACTION KPIs] Error fetching campaigns:', campaignsError)
      } else if (allCampaigns) {
        actionKPIs.totalCampaigns = allCampaigns.length
        actionKPIs.activeCampaigns = allCampaigns.filter(c => c.status === 'ACTIVE').length

        console.log('[ACTION KPIs] Total campaigns:', actionKPIs.totalCampaigns)
        console.log('[ACTION KPIs] Active campaigns:', actionKPIs.activeCampaigns)

        const campaignIds = allCampaigns.map(c => c.campaign_id)

        // 2. Get performance data for the last 7 days
        const { data: performanceData, error: perfError } = await supabase
          .from('meta_campaign_daily_stats')
          .select('campaign_id, date, spend, purchase_value, conversions')
          .eq('brand_id', brandId)
          .in('campaign_id', campaignIds)
          .gte('date', startDateStr)
          .lte('date', endDateStr)

        if (perfError) {
          console.error('[ACTION KPIs] Error fetching performance:', perfError)
        } else if (performanceData && performanceData.length > 0) {
          console.log('[ACTION KPIs] Performance records:', performanceData.length)

          // Calculate budget utilization (average daily spend vs daily budget)
          const totalDailyBudget = allCampaigns
            .filter(c => c.status === 'ACTIVE' && c.budget && c.budget_type === 'daily')
            .reduce((sum, c) => sum + parseFloat(c.budget || '0'), 0)

          const totalSpend = performanceData.reduce((sum, p) => sum + (p.spend || 0), 0)
          const avgDailySpend = totalSpend / 7 // 7 days

          if (totalDailyBudget > 0) {
            actionKPIs.budgetUtilization = Math.round((avgDailySpend / totalDailyBudget) * 100)
          }

          console.log('[ACTION KPIs] Budget utilization:', actionKPIs.budgetUtilization, '%')

          // Calculate per-campaign performance
          const campaignPerformance: Record<string, { 
            spend: number; 
            revenue: number; 
            conversions: number;
            name: string;
          }> = {}

          performanceData.forEach(stat => {
            if (!campaignPerformance[stat.campaign_id]) {
              const campaign = allCampaigns.find(c => c.campaign_id === stat.campaign_id)
              campaignPerformance[stat.campaign_id] = {
                spend: 0,
                revenue: 0,
                conversions: 0,
                name: campaign?.campaign_name || stat.campaign_id
              }
            }

            campaignPerformance[stat.campaign_id].spend += stat.spend || 0
            campaignPerformance[stat.campaign_id].revenue += stat.purchase_value || 0
            campaignPerformance[stat.campaign_id].conversions += stat.conversions || 0
          })

          // Find top performer by ROAS
          let bestRoas = 0
          let topCampaignId: string | null = null

          Object.entries(campaignPerformance).forEach(([campaignId, perf]) => {
            const roas = perf.spend > 0 ? perf.revenue / perf.spend : 0
            if (roas > bestRoas && perf.spend > 1) { // Only consider campaigns with > $1 spend
              bestRoas = roas
              topCampaignId = campaignId
            }
          })

          if (topCampaignId && campaignPerformance[topCampaignId]) {
            const topPerf = campaignPerformance[topCampaignId]
            actionKPIs.topPerformer = {
              name: topPerf.name,
              roas: bestRoas,
              spend: topPerf.spend
            }
            console.log('[ACTION KPIs] Top performer:', actionKPIs.topPerformer)
          }

          // Count campaigns needing attention (ROAS < 1.0 or CTR very low)
          actionKPIs.needsAttention = Object.values(campaignPerformance).filter(perf => {
            const roas = perf.spend > 0 ? perf.revenue / perf.spend : 0
            return perf.spend > 1 && roas < 1.0 // ROAS below 1x
          }).length

          console.log('[ACTION KPIs] Campaigns needing attention:', actionKPIs.needsAttention)
        }
      }
    }

    console.log('[ACTION KPIs] Final result:', actionKPIs)

    return NextResponse.json({ 
      actionKPIs,
      success: true 
    })

  } catch (error) {
    console.error('[ACTION KPIs] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Failed to calculate action KPIs' },
      { status: 500 }
    )
  }
}
