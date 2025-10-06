import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'
import { getMondayToMondayRange } from '@/lib/date-utils'

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
    
    // Use last 30 days of data for insights (more comprehensive)
    const today = new Date()
    const thirtyDaysAgo = new Date(today)
    thirtyDaysAgo.setDate(today.getDate() - 30)
    const fromDate = searchParams.get('from') || thirtyDaysAgo.toISOString().split('T')[0]
    const toDate = searchParams.get('to') || today.toISOString().split('T')[0]
    
    const platforms = searchParams.get('platforms')?.split(',') || ['meta']

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    const insights = await generateQuickInsights(brandId, fromDate, toDate, platforms)
    
    console.log(`[Quick Insights] Generated ${insights.length} insights for brand ${brandId} from ${fromDate} to ${toDate}`)
    
    return NextResponse.json({ insights })

  } catch (error) {
    console.error('Error fetching quick insights:', error)
    return NextResponse.json({ error: 'Failed to fetch quick insights' }, { status: 500 })
  }
}

async function generateQuickInsights(brandId: string, fromDate: string, toDate: string, platforms: string[]) {
  const insights = []

  if (platforms.includes('meta')) {
    // Get ad creative performance
    const { data: adStats } = await supabase
      .from('meta_ad_daily_stats')
      .select('ad_id, ad_name, spend, revenue, impressions, clicks, ctr, roas')
      .eq('brand_id', brandId)
      .gte('date', fromDate)
      .lte('date', toDate)
    
    console.log(`[Quick Insights] Found ${adStats?.length || 0} ad stats records`)

    // Aggregate by ad
    const adPerformance = new Map()
    adStats?.forEach(stat => {
      if (!adPerformance.has(stat.ad_id)) {
        adPerformance.set(stat.ad_id, {
          ad_id: stat.ad_id,
          ad_name: stat.ad_name || 'Unnamed Ad',
          spend: 0,
          revenue: 0,
          impressions: 0,
          clicks: 0
        })
      }
      const ad = adPerformance.get(stat.ad_id)
      ad.spend += Number(stat.spend) || 0
      ad.revenue += Number(stat.revenue) || 0
      ad.impressions += Number(stat.impressions) || 0
      ad.clicks += Number(stat.clicks) || 0
    })

    // Find top performing ad by ROAS
    let topCreative = null
    let highestROAS = 0
    adPerformance.forEach(ad => {
      const roas = ad.spend > 0 ? ad.revenue / ad.spend : 0
      if (roas > highestROAS && ad.spend > 1) { // At least $1 spend
        highestROAS = roas
        topCreative = ad
      }
    })

    // If no ad with ROAS, find ad with most clicks (engagement)
    if (!topCreative) {
      let mostClicks = 0
      adPerformance.forEach(ad => {
        if (ad.clicks > mostClicks && ad.spend > 0.5) {
          mostClicks = ad.clicks
          topCreative = ad
        }
      })
      if (topCreative) {
        const ctr = topCreative.impressions > 0 ? (topCreative.clicks / topCreative.impressions) * 100 : 0
        insights.push({
          type: 'top_creative',
          label: 'Top Creative',
          value: topCreative.ad_name.length > 40 ? topCreative.ad_name.substring(0, 40) + '...' : topCreative.ad_name,
          metric: `${ctr.toFixed(2)}% CTR`,
          icon: '🎨',
          color: 'green'
        })
      }
    } else {
      insights.push({
        type: 'top_creative',
        label: 'Top Creative',
        value: topCreative.ad_name.length > 40 ? topCreative.ad_name.substring(0, 40) + '...' : topCreative.ad_name,
        metric: `${highestROAS.toFixed(2)}x ROAS`,
        icon: '🎨',
        color: 'green'
      })
    }

    // Get demographic performance
    const { data: demographics } = await supabase
      .from('meta_demographics')
      .select('*')
      .eq('brand_id', brandId)
      .gte('date_range_start', fromDate)
      .lte('date_range_end', toDate)

    // Find best performing age/gender combo
    const demoPerformance = new Map()
    demographics?.forEach(demo => {
      const key = `${demo.age || 'Unknown'}_${demo.gender || 'Unknown'}`
      if (!demoPerformance.has(key)) {
        demoPerformance.set(key, {
          age: demo.age,
          gender: demo.gender,
          spend: 0,
          conversions: 0,
          impressions: 0
        })
      }
      const d = demoPerformance.get(key)
      d.spend += Number(demo.spend) || 0
      d.conversions += Number(demo.conversions) || 0
      d.impressions += Number(demo.impressions) || 0
    })

    let bestDemographic = null
    let highestConversionRate = 0
    demoPerformance.forEach(demo => {
      const conversionRate = demo.impressions > 0 ? (demo.conversions / demo.impressions) * 100 : 0
      if (conversionRate > highestConversionRate && demo.spend > 0.5) { // Lower threshold to $0.50
        highestConversionRate = conversionRate
        bestDemographic = demo
      }
    })

    // If no conversions, find demographic with highest impressions
    if (!bestDemographic) {
      let mostImpressions = 0
      demoPerformance.forEach(demo => {
        if (demo.impressions > mostImpressions && demo.spend > 0.5) {
          mostImpressions = demo.impressions
          bestDemographic = demo
        }
      })
      if (bestDemographic) {
        const genderLabel = bestDemographic.gender === 'male' ? 'M' : bestDemographic.gender === 'female' ? 'F' : 'All'
        insights.push({
          type: 'best_demographic',
          label: 'Top Demographic',
          value: `${bestDemographic.age}, ${genderLabel}`,
          metric: `${bestDemographic.impressions.toLocaleString()} views`,
          icon: '👥',
          color: 'blue'
        })
      }
    } else {
      const genderLabel = bestDemographic.gender === 'male' ? 'M' : bestDemographic.gender === 'female' ? 'F' : 'All'
      insights.push({
        type: 'best_demographic',
        label: 'Top Demographic',
        value: `${bestDemographic.age}, ${genderLabel}`,
        metric: `${highestConversionRate.toFixed(2)}% CVR`,
        icon: '👥',
        color: 'blue'
      })
    }

    // Get geographic performance
    const { data: locations } = await supabase
      .from('shopify_customers')
      .select('province, city')
      .eq('brand_id', brandId)

    const locationCounts = new Map()
    locations?.forEach(loc => {
      const key = loc.province || loc.city || 'Unknown'
      locationCounts.set(key, (locationCounts.get(key) || 0) + 1)
    })

    let topLocation = null
    let maxCount = 0
    locationCounts.forEach((count, location) => {
      if (count > maxCount) {
        maxCount = count
        topLocation = location
      }
    })

    if (topLocation && maxCount > 0) {
      insights.push({
        type: 'top_region',
        label: 'Top Region',
        value: topLocation,
        metric: `${maxCount} customers`,
        icon: '📍',
        color: 'purple'
      })
    }

    // Find wasted spend (high spend, low ROAS campaigns)
    const { data: campaignStats } = await supabase
      .from('meta_campaign_daily_stats')
      .select('campaign_id, campaign_name, spend, revenue')
      .eq('brand_id', brandId)
      .gte('date', fromDate)
      .lte('date', toDate)

    const campaignPerformance = new Map()
    campaignStats?.forEach(stat => {
      if (!campaignPerformance.has(stat.campaign_id)) {
        campaignPerformance.set(stat.campaign_id, {
          campaign_name: stat.campaign_name || 'Unnamed Campaign',
          spend: 0,
          revenue: 0
        })
      }
      const camp = campaignPerformance.get(stat.campaign_id)
      camp.spend += Number(stat.spend) || 0
      camp.revenue += Number(stat.revenue) || 0
    })

    let worstCampaign = null
    let lowestROAS = Infinity
    campaignPerformance.forEach(camp => {
      const roas = camp.spend > 0 ? camp.revenue / camp.spend : 0
      if (roas < lowestROAS && camp.spend > 5 && roas < 0.5) { // At least $5 spend and ROAS < 0.5
        lowestROAS = roas
        worstCampaign = camp
      }
    })

    if (worstCampaign) {
      insights.push({
        type: 'wasted_spend',
        label: 'Wasted Spend Alert',
        value: worstCampaign.campaign_name.length > 40 ? worstCampaign.campaign_name.substring(0, 40) + '...' : worstCampaign.campaign_name,
        metric: `$${worstCampaign.spend.toFixed(2)} @ ${lowestROAS.toFixed(2)}x`,
        icon: '⚠️',
        color: 'red'
      })
    }
  }

  return insights
}

