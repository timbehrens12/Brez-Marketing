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

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    // Always use last 7 days for current performance
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const today = new Date().toISOString().split('T')[0]

    console.log(`🎯 AUDIENCE DEBUG: Querying for brand ${brandId}`)
    console.log(`🎯 AUDIENCE DEBUG: Platforms filter:`, platforms)
    console.log(`🎯 AUDIENCE DEBUG: Status filter:`, status)
    console.log(`🎯 AUDIENCE DEBUG: Using fixed 7-day window: ${sevenDaysAgo} to ${today}`)

    // First, get campaign metadata to filter by platform and status
    let campaignMetadata: any = {}
    if (platforms.includes('meta')) {
      console.log(`🎯 AUDIENCE DEBUG: Fetching Meta campaign metadata...`)
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
      
      console.log(`🎯 AUDIENCE DEBUG: Query results - campaigns found:`, metaCampaigns?.length || 0)
      if (metaCampaigns && metaCampaigns.length > 0) {
        console.log(`🎯 AUDIENCE DEBUG: Sample campaign:`, {
          name: metaCampaigns[0].campaign_name,
          status: metaCampaigns[0].status,
          id: metaCampaigns[0].campaign_id?.slice(0, 8)
        })
      }
      
      if (metaError) {
        console.error(`🎯 AUDIENCE DEBUG: Error fetching Meta campaigns:`, metaError)
      } else {
        console.log(`🎯 AUDIENCE DEBUG: Found ${metaCampaigns?.length || 0} Meta campaigns matching filter`)
        metaCampaigns?.forEach((c: any) => {
          campaignMetadata[c.campaign_id] = {
            name: c.campaign_name,
            status: c.status,
            platform: 'meta'
          }
        })
      }
    }
    
    const allowedCampaignIds = Object.keys(campaignMetadata)
    console.log(`🎯 AUDIENCE DEBUG: Allowed campaign IDs after filtering:`, allowedCampaignIds.length)
    
    if (allowedCampaignIds.length === 0) {
      console.log(`🎯 AUDIENCE DEBUG: No campaigns match filters, returning empty`)
      return NextResponse.json({ opportunities: [] })
    }

    // Get campaign and audience performance data
    // Always use last 7 days
    const result = await supabase
      .from('meta_campaign_daily_stats')
      .select(`
        campaign_id,
        date,
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
      .in('campaign_id', allowedCampaignIds)
      .gte('date', sevenDaysAgo)
      .lte('date', today)

    if (result.error) {
      console.error(`🎯 AUDIENCE DEBUG: Query error:`, result.error)
    }

    let campaignStats = result.data
    console.log(`🎯 AUDIENCE DEBUG: 7-day result: ${campaignStats?.length || 0} records`)
    console.log(`🎯 AUDIENCE DEBUG: Sample record:`, campaignStats?.[0] || 'No records')

    // If no data in last 7 days, try last 30 days
    if (!campaignStats || campaignStats.length === 0) {
      console.log(`🎯 AUDIENCE DEBUG: No 7-day data, trying 30-day fallback...`)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      console.log(`🎯 AUDIENCE DEBUG: 30-day date: ${thirtyDaysAgo}`)
      const { data: fallbackStats } = await supabase
        .from('meta_campaign_daily_stats')
        .select(`
          campaign_id,
          date,
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
        .in('campaign_id', allowedCampaignIds)
        .gte('date', thirtyDaysAgo)
      
      campaignStats = fallbackStats
      console.log(`🎯 AUDIENCE DEBUG: 30-day result: ${campaignStats?.length || 0} records`)
      console.log(`🎯 AUDIENCE DEBUG: 30-day sample:`, campaignStats?.[0] || 'No records')
    }

    // If still no data in 30 days, try ALL available data for this brand
    if (!campaignStats || campaignStats.length === 0) {
      console.log(`🎯 AUDIENCE DEBUG: No 30-day data, fetching ALL historical data...`)
      const { data: allStats } = await supabase
        .from('meta_campaign_daily_stats')
        .select(`
          campaign_id,
          date,
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
        .in('campaign_id', allowedCampaignIds)
        .order('date', { ascending: false })
        .limit(1000) // Reasonable limit
      
      campaignStats = allStats
      console.log(`🎯 AUDIENCE DEBUG: ALL data result: ${campaignStats?.length || 0} records`)
      console.log(`🎯 AUDIENCE DEBUG: ALL data sample:`, campaignStats?.[0] || 'No records')
    }

    // Log total records in database for this brand
    const { count } = await supabase
      .from('meta_campaign_daily_stats')
      .select('*', { count: 'exact', head: true })
      .eq('brand_id', brandId)
    
    console.log(`🎯 AUDIENCE DEBUG: Total records in DB for brand ${brandId}: ${count || 0}`)
    console.log(`🎯 AUDIENCE DEBUG: FINAL RESULT: ${campaignStats?.length || 0} campaign records`)
    
    // Old log for backwards compatibility
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
    // Lower thresholds if no high performers exist
    let topPerformers = campaigns
      .filter((campaign: any) => campaign.avgRoas > 1.5 && campaign.totalConversions > 2 && campaign.totalSpend > 50)
      .sort((a: any, b: any) => b.avgRoas - a.avgRoas)
      .slice(0, 3)

    // If no high performers, use campaigns with any conversions and reasonable spend
    if (topPerformers.length === 0) {
      topPerformers = campaigns
        .filter((campaign: any) => campaign.totalConversions > 0 && campaign.totalSpend > 10)
        .sort((a: any, b: any) => b.totalConversions - a.totalConversions)
        .slice(0, 2)
    }

    // If still no performers, use any campaigns with spend and clicks
    if (topPerformers.length === 0) {
      topPerformers = campaigns
        .filter((campaign: any) => campaign.totalSpend > 5 && campaign.totalClicks > 5)
        .sort((a: any, b: any) => b.avgCtr - a.avgCtr)
        .slice(0, 1)
    }

    console.log(`Found ${topPerformers.length} top performing campaigns`)

    topPerformers.forEach((campaign: any, index: number) => {
      const estimatedReach = Math.round(campaign.totalImpressions / campaign.days * 7) // Weekly reach estimate
      
      // Adjust description based on performance level
      let description
      if (campaign.avgRoas > 1.5) {
        description = `Create lookalike audience based on high-converting customers from this campaign (${campaign.avgRoas.toFixed(1)}x ROAS)`
      } else if (campaign.totalConversions > 0) {
        description = `Create lookalike audience based on customers who converted from this campaign (${campaign.totalConversions} conversions)`
      } else {
        description = `Create lookalike audience based on engaged users from this campaign (${campaign.avgCtr.toFixed(1)}% CTR)`
      }
      
      const metadata = campaignMetadata[campaign.campaign_id] || {}
      opportunities.push({
        id: `lookalike-${campaign.campaign_id}`,
        type: 'lookalike',
        title: `Lookalike ${index + 1}% - ${metadata.name || `Campaign ${campaign.campaign_id.slice(0, 8)}`}`,
        description,
        platform: metadata.platform || 'meta',
        status: metadata.status || 'UNKNOWN',
        currentReach: estimatedReach,
        projectedReach: Math.round(estimatedReach * 2.5), // 2.5x expansion potential
        estimatedCpa: Math.round(Math.max(campaign.avgCpc * 1.15, 5)), // Slightly higher CPA for expansion, min $5
        confidence: Math.min(95, Math.round(60 + Math.max(campaign.avgRoas - 1, campaign.totalConversions, campaign.avgCtr) * 5))
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
