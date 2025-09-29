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

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    // Get campaign and audience performance data
    const { data: campaignStats } = await supabase
      .from('meta_campaign_daily_stats')
      .select(`
        campaign_id,
        campaign_name,
        spend,
        impressions,
        clicks,
        conversions,
        ctr,
        cpc,
        roas,
        purchase_value
      `)
      .eq('brand_id', brandId)
      .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]) // Last 30 days

    console.log(`Found ${campaignStats?.length || 0} campaign records for brand ${brandId}`)

    const opportunities = []

    if (!campaignStats || campaignStats.length === 0) {
      return NextResponse.json({ opportunities: [] })
    }

    // Group campaigns by ID and aggregate data
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

    const campaigns = Object.values(campaignGroups).map((campaign: any) => ({
      ...campaign,
      avgRoas: campaign.totalSpend > 0 ? campaign.totalRevenue / campaign.totalSpend : 0,
      avgCpc: campaign.totalClicks > 0 ? campaign.totalSpend / campaign.totalClicks : 0,
      avgCtr: campaign.totalImpressions > 0 ? (campaign.totalClicks / campaign.totalImpressions) * 100 : 0,
      avgDailySpend: campaign.totalSpend / campaign.days
    }))

    // Generate lookalike audience opportunities from top performers
    const topPerformers = campaigns
      .filter((campaign: any) => campaign.avgRoas > 1.5 && campaign.totalConversions > 2 && campaign.totalSpend > 50)
      .sort((a: any, b: any) => b.avgRoas - a.avgRoas)
      .slice(0, 3)

    console.log(`Found ${topPerformers.length} top performing campaigns`)

    topPerformers.forEach((campaign: any, index: number) => {
      const estimatedReach = Math.round(campaign.totalImpressions / campaign.days * 7) // Weekly reach estimate
      
      opportunities.push({
        id: `lookalike-${campaign.campaign_id}`,
        type: 'lookalike',
        title: `Lookalike ${index + 1}% - ${campaign.campaign_name || 'Campaign'}`,
        description: `Create lookalike audience based on high-converting customers from this campaign (${campaign.avgRoas.toFixed(1)}x ROAS)`,
        currentReach: estimatedReach,
        projectedReach: Math.round(estimatedReach * 2.5), // 2.5x expansion potential
        estimatedCpa: Math.round(campaign.avgCpc * 1.15), // Slightly higher CPA for expansion
        confidence: Math.min(95, Math.round(60 + (campaign.avgRoas - 1.5) * 15))
      })
    })

    // Generate interest expansion based on campaign performance
    if (campaigns.length > 0) {
      const avgCpc = campaigns.reduce((sum: number, c: any) => sum + c.avgCpc, 0) / campaigns.length
      const avgReach = campaigns.reduce((sum: number, c: any) => sum + (c.totalImpressions / c.days * 7), 0) / campaigns.length
      
      opportunities.push({
        id: 'interest-expansion',
        type: 'interest',
        title: 'Interest Expansion',
        description: 'Target complementary interests based on your current audience performance patterns',
        currentReach: Math.round(avgReach),
        projectedReach: Math.round(avgReach * 1.8),
        estimatedCpa: Math.round(avgCpc * 1.1),
        confidence: 72
      })
    }

    // Generate geographic expansion based on current performance
    if (campaigns.some((c: any) => c.avgRoas > 2.0)) {
      const strongPerformers = campaigns.filter((c: any) => c.avgRoas > 2.0)
      const avgReach = strongPerformers.reduce((sum: number, c: any) => sum + (c.totalImpressions / c.days * 7), 0) / strongPerformers.length
      const avgCpc = strongPerformers.reduce((sum: number, c: any) => sum + c.avgCpc, 0) / strongPerformers.length

      opportunities.push({
        id: 'geo-expansion',
        type: 'geographic',
        title: 'Geographic Expansion',
        description: 'Expand to similar markets based on your high-performing campaign locations',
        currentReach: Math.round(avgReach),
        projectedReach: Math.round(avgReach * 1.6),
        estimatedCpa: Math.round(avgCpc * 1.05),
        confidence: 78
      })
    }

    // Sort opportunities by confidence
    opportunities.sort((a, b) => b.confidence - a.confidence)

    console.log(`Returning ${opportunities.length} audience expansion opportunities`)

    return NextResponse.json({ opportunities })

  } catch (error) {
    console.error('Error fetching audience expansion opportunities:', error)
    return NextResponse.json({ error: 'Failed to fetch audience expansion opportunities' }, { status: 500 })
  }
}
