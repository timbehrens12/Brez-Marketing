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
    // 1. TOP CREATIVE - Ad with best CTR
    const { data: adStats } = await supabase
      .from('meta_ad_daily_stats')
      .select('ad_id, ad_name, spend, impressions, clicks, date')
      .eq('brand_id', brandId)
      .gte('date', fromDate)
      .lte('date', toDate)
    
    console.log(`[Quick Insights] Found ${adStats?.length || 0} ad stats records`)

    if (adStats && adStats.length > 0) {
      // Aggregate by ad
      const adPerformance = new Map()
      adStats.forEach(stat => {
        if (!adPerformance.has(stat.ad_id)) {
          adPerformance.set(stat.ad_id, {
            ad_name: stat.ad_name || 'Unnamed Ad',
            spend: 0,
            impressions: 0,
            clicks: 0,
            dates: []
          })
        }
        const ad = adPerformance.get(stat.ad_id)
        ad.spend += Number(stat.spend) || 0
        ad.impressions += Number(stat.impressions) || 0
        ad.clicks += Number(stat.clicks) || 0
        ad.dates.push(stat.date)
      })

      // Find ad with highest CTR (minimum $1 spend)
      let topAd = null
      let highestCTR = 0
      adPerformance.forEach(ad => {
        const ctr = ad.impressions > 0 ? (ad.clicks / ad.impressions) * 100 : 0
        if (ctr > highestCTR && ad.spend >= 1) {
          highestCTR = ctr
          topAd = ad
        }
      })

      if (topAd) {
        insights.push({
          type: 'top_creative',
          label: 'Top Creative',
          value: topAd.ad_name.length > 35 ? topAd.ad_name.substring(0, 35) + '...' : topAd.ad_name,
          metric: `${highestCTR.toFixed(2)}% CTR`,
          icon: '🎨'
        })
      }

      // 2. CREATIVE FATIGUE - Check for declining engagement
      adPerformance.forEach(ad => {
        if (ad.dates.length >= 3 && ad.spend >= 5) {
          const sortedDates = [...ad.dates].sort()
          const firstHalf = sortedDates.slice(0, Math.floor(sortedDates.length / 2))
          const secondHalf = sortedDates.slice(Math.floor(sortedDates.length / 2))
          
          // Calculate CTR for first half vs second half
          const firstHalfStats = adStats.filter(s => s.ad_id === ad.dates[0] && firstHalf.includes(s.date))
          const secondHalfStats = adStats.filter(s => s.ad_id === ad.dates[0] && secondHalf.includes(s.date))
          
          const firstCTR = firstHalfStats.reduce((sum, s) => sum + (Number(s.impressions) || 0), 0) > 0
            ? (firstHalfStats.reduce((sum, s) => sum + (Number(s.clicks) || 0), 0) / firstHalfStats.reduce((sum, s) => sum + (Number(s.impressions) || 0), 0)) * 100
            : 0
          const secondCTR = secondHalfStats.reduce((sum, s) => sum + (Number(s.impressions) || 0), 0) > 0
            ? (secondHalfStats.reduce((sum, s) => sum + (Number(s.clicks) || 0), 0) / secondHalfStats.reduce((sum, s) => sum + (Number(s.impressions) || 0), 0)) * 100
            : 0
          
          // If CTR dropped >20%, flag fatigue
          if (firstCTR > 0 && secondCTR < firstCTR * 0.8) {
            insights.push({
              type: 'creative_fatigue',
              label: 'Creative Fatigue',
              value: ad.ad_name.length > 35 ? ad.ad_name.substring(0, 35) + '...' : ad.ad_name,
              metric: `${Math.round(((firstCTR - secondCTR) / firstCTR) * 100)}% decline`,
              icon: '⚠️'
            })
          }
        }
      })
    }

    // 3. BEST DEMOGRAPHIC - Age/gender with highest engagement (use ANY data available)
    const { data: demographics } = await supabase
      .from('meta_demographics')
      .select('breakdown_type, breakdown_value, spend, impressions, clicks')
      .eq('brand_id', brandId)

    if (demographics && demographics.length > 0) {
      // Aggregate all demographics regardless of type
      const demoMap = new Map()
      demographics.forEach(demo => {
        const key = demo.breakdown_value
        if (!demoMap.has(key)) {
          demoMap.set(key, {
            spend: 0,
            impressions: 0,
            clicks: 0,
            type: demo.breakdown_type
          })
        }
        const d = demoMap.get(key)
        d.spend += Number(demo.spend) || 0
        d.impressions += Number(demo.impressions) || 0
        d.clicks += Number(demo.clicks) || 0
      })

      // Find demographic with highest CTR (minimum $0.50 spend)
      let bestDemo = null
      let highestCTR = 0
      let bestValue = ''
      demoMap.forEach((demo, value) => {
        const ctr = demo.impressions > 0 ? (demo.clicks / demo.impressions) * 100 : 0
        if (ctr > highestCTR && demo.spend >= 0.5) {
          highestCTR = ctr
          bestDemo = demo
          bestValue = value
        }
      })

      if (bestDemo) {
        // Parse different formats
        let displayValue = bestValue
        if (bestValue.includes('_')) {
          const parts = bestValue.split('_')
          const age = parts[0]
          const gender = parts[1] === 'male' ? 'M' : parts[1] === 'female' ? 'F' : parts[1]
          displayValue = `${age}, ${gender}`
        }
        
        insights.push({
          type: 'best_demographic',
          label: 'Best Demographic',
          value: displayValue,
          metric: `${highestCTR.toFixed(2)}% CTR`,
          icon: '👥'
        })
      }
    }

    // 4. TOP REGION - From Shopify customer data
    const { data: locations } = await supabase
      .from('shopify_customers')
      .select('province, city')
      .eq('brand_id', brandId)

    if (locations && locations.length > 0) {
      const regionCounts = new Map()
      locations.forEach(loc => {
        const region = loc.province || loc.city || 'Unknown'
        regionCounts.set(region, (regionCounts.get(region) || 0) + 1)
      })

      let topRegion = ''
      let maxCount = 0
      regionCounts.forEach((count, region) => {
        if (count > maxCount) {
          maxCount = count
          topRegion = region
        }
      })

      if (topRegion && maxCount > 0) {
        insights.push({
          type: 'top_region',
          label: 'Top Region',
          value: topRegion,
          metric: `${maxCount} orders`,
          icon: '📍'
        })
      }
    }
  }

  console.log(`[Quick Insights] Generated ${insights.length} insights`)
  return insights
}

