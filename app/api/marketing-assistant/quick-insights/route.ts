import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

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

    console.log(`[Quick Insights AI] Generating insights for brand ${brandId} from ${fromDate} to ${toDate}`)

    const insights = await generateAIInsights(brandId, fromDate, toDate, platforms)
    
    console.log(`[Quick Insights AI] Generated ${insights.length} AI-powered insights`)
    
    return NextResponse.json({ insights })

  } catch (error) {
    console.error('Error fetching quick insights:', error)
    return NextResponse.json({ error: 'Failed to fetch quick insights' }, { status: 500 })
  }
}

async function generateAIInsights(brandId: string, fromDate: string, toDate: string, platforms: string[]) {
  console.log('[Quick Insights AI] 📊 Collecting performance data...')

  // Collect all available data
  const performanceData: any = {
    meta_ads: [],
    demographics: [],
    shopify_customers: [],
    summary: {
      totalSpend: 0,
      totalImpressions: 0,
      totalClicks: 0,
      totalOrders: 0,
      averageCTR: 0,
      dateRange: { from: fromDate, to: toDate }
    }
  }

  if (platforms.includes('meta')) {
    // Get Meta ad performance
    const { data: adStats } = await supabase
      .from('meta_ad_daily_stats')
      .select('ad_id, ad_name, spend, impressions, clicks, date')
      .eq('brand_id', brandId)
      .gte('date', fromDate)
      .lte('date', toDate)
      .order('date', { ascending: false })
    
    performanceData.meta_ads = adStats || []
    console.log(`[Quick Insights AI] Found ${adStats?.length || 0} ad stats records`)

    // Calculate summary metrics
    if (adStats && adStats.length > 0) {
      performanceData.summary.totalSpend = adStats.reduce((sum, s) => sum + (Number(s.spend) || 0), 0)
      performanceData.summary.totalImpressions = adStats.reduce((sum, s) => sum + (Number(s.impressions) || 0), 0)
      performanceData.summary.totalClicks = adStats.reduce((sum, s) => sum + (Number(s.clicks) || 0), 0)
      performanceData.summary.averageCTR = performanceData.summary.totalImpressions > 0
        ? (performanceData.summary.totalClicks / performanceData.summary.totalImpressions) * 100
        : 0
    }

    // Get demographic data
    const { data: demographics } = await supabase
      .from('meta_demographics')
      .select('breakdown_type, breakdown_value, spend, impressions, clicks')
      .eq('brand_id', brandId)
    
    performanceData.demographics = demographics || []
    console.log(`[Quick Insights AI] Found ${demographics?.length || 0} demographic records`)

    // Get Shopify customer data
    const { data: customers } = await supabase
      .from('shopify_customers')
      .select('province, city, total_spent, orders_count')
      .eq('brand_id', brandId)
    
    performanceData.shopify_customers = customers || []
    performanceData.summary.totalOrders = customers?.length || 0
    console.log(`[Quick Insights AI] Found ${customers?.length || 0} Shopify customers`)
  }

  // If no data at all, return empty
  if (performanceData.meta_ads.length === 0 && performanceData.shopify_customers.length === 0) {
    console.log('[Quick Insights AI] ❌ No data available')
    return []
  }

  // Prepare data summary for AI (limit data sent to avoid token limits)
  const dataSummary = prepareDataSummaryForAI(performanceData)

  console.log('[Quick Insights AI] 🤖 Sending to GPT-4 for analysis...')

  // Call OpenAI to generate insights
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are a marketing analytics AI assistant. Analyze brand performance data and generate exactly 3 actionable insights.

CRITICAL RULES:
1. Generate EXACTLY 3 insights, no more, no less
2. Each insight should be unique and actionable
3. Focus on the MOST IMPORTANT patterns, opportunities, or concerns
4. Be specific with numbers and metrics
5. Each insight should have:
   - type: snake_case identifier (e.g., "top_creative", "demographic_opportunity", "spending_efficiency")
   - label: Short category name (2-3 words max)
   - value: The key finding (max 35 chars)
   - metric: Supporting metric or context (e.g., "2.5% CTR", "$450 spent")
   - icon: Single emoji that represents the insight

INSIGHT CATEGORIES (choose 3 that are most relevant):
- Top performing creative/ad
- Underperforming creative that needs attention
- Best performing demographic
- Demographic opportunity (untapped potential)
- Geographic concentration or opportunity
- Spending efficiency (waste or optimization)
- Creative fatigue indicators
- Audience saturation
- Budget allocation issues
- ROAS/ROI insights
- Engagement trends
- Any other data-driven insight you discover

Return ONLY valid JSON array with exactly 3 insights, no explanation text.`
      },
      {
        role: 'user',
        content: `Analyze this brand's performance data and generate exactly 3 actionable insights:

${JSON.stringify(dataSummary, null, 2)}

Return exactly 3 insights in this JSON format:
[
  {
    "type": "insight_type_here",
    "label": "Category Name",
    "value": "Key Finding Here",
    "metric": "Supporting Metric",
    "icon": "📊"
  }
]`
      }
    ],
    temperature: 0.7,
    max_tokens: 1000,
  })

  const aiResponse = completion.choices[0].message.content?.trim() || '[]'
  console.log('[Quick Insights AI] 🤖 GPT Response:', aiResponse)

  try {
    // Parse AI response
    let insights = JSON.parse(aiResponse)
    
    // Ensure we have exactly 3 insights
    if (!Array.isArray(insights)) {
      console.error('[Quick Insights AI] ❌ AI did not return an array')
      insights = []
    }
    
    // Validate structure
    insights = insights.filter((insight: any) => 
      insight.type && insight.label && insight.value && insight.metric && insight.icon
    ).slice(0, 3) // Take only first 3

    // If we don't have exactly 3, add fallback insights
    if (insights.length < 3 && performanceData.summary.totalSpend > 0) {
      console.log(`[Quick Insights AI] ⚠️ Only got ${insights.length} insights from AI, adding fallbacks...`)
      
      const fallbacks = [
        {
          type: 'total_spend',
          label: 'Total Investment',
          value: `$${performanceData.summary.totalSpend.toFixed(2)}`,
          metric: 'last 30 days',
          icon: '💰'
        },
        {
          type: 'total_reach',
          label: 'Total Reach',
          value: `${(performanceData.summary.totalImpressions / 1000).toFixed(1)}K`,
          metric: 'impressions',
          icon: '👁️'
        },
        {
          type: 'avg_ctr',
          label: 'Average CTR',
          value: `${performanceData.summary.averageCTR.toFixed(2)}%`,
          metric: 'click-through rate',
          icon: '📈'
        }
      ]
      
      // Add fallbacks until we have 3
      while (insights.length < 3 && fallbacks.length > 0) {
        insights.push(fallbacks.shift())
      }
    }

    console.log(`[Quick Insights AI] ✅ Returning ${insights.length} insights:`, insights.map((i: any) => i.type))
    return insights

  } catch (parseError) {
    console.error('[Quick Insights AI] ❌ Failed to parse AI response:', parseError)
    console.error('[Quick Insights AI] Raw response:', aiResponse)
    
    // Return basic fallback insights if AI fails
    if (performanceData.summary.totalSpend > 0) {
      return [
        {
          type: 'total_spend',
          label: 'Total Investment',
          value: `$${performanceData.summary.totalSpend.toFixed(2)}`,
          metric: 'last 30 days',
          icon: '💰'
        },
        {
          type: 'total_reach',
          label: 'Total Reach',
          value: `${(performanceData.summary.totalImpressions / 1000).toFixed(1)}K`,
          metric: 'impressions',
          icon: '👁️'
        },
        {
          type: 'avg_ctr',
          label: 'Average CTR',
          value: `${performanceData.summary.averageCTR.toFixed(2)}%`,
          metric: 'click-through rate',
          icon: '📈'
        }
      ]
    }
    
    return []
  }
}

function prepareDataSummaryForAI(data: any) {
  // Aggregate ad performance by ad_id
  const adPerformance = new Map()
  data.meta_ads.forEach((stat: any) => {
    if (!adPerformance.has(stat.ad_id)) {
      adPerformance.set(stat.ad_id, {
        ad_id: stat.ad_id,
        ad_name: stat.ad_name || 'Unnamed Ad',
        spend: 0,
        impressions: 0,
        clicks: 0,
        days: []
      })
    }
    const ad = adPerformance.get(stat.ad_id)
    ad.spend += Number(stat.spend) || 0
    ad.impressions += Number(stat.impressions) || 0
    ad.clicks += Number(stat.clicks) || 0
    ad.days.push(stat.date)
  })

  // Calculate CTR for each ad
  const topAds = Array.from(adPerformance.values())
    .map((ad: any) => ({
      ...ad,
      ctr: ad.impressions > 0 ? (ad.clicks / ad.impressions) * 100 : 0,
      cpc: ad.clicks > 0 ? ad.spend / ad.clicks : 0
    }))
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 10) // Top 10 ads by spend

  // Aggregate demographics
  const demoPerformance = new Map()
  data.demographics.forEach((demo: any) => {
    const key = `${demo.breakdown_type}:${demo.breakdown_value}`
    if (!demoPerformance.has(key)) {
      demoPerformance.set(key, {
        type: demo.breakdown_type,
        value: demo.breakdown_value,
        spend: 0,
        impressions: 0,
        clicks: 0
      })
    }
    const d = demoPerformance.get(key)
    d.spend += Number(demo.spend) || 0
    d.impressions += Number(demo.impressions) || 0
    d.clicks += Number(demo.clicks) || 0
  })

  const topDemographics = Array.from(demoPerformance.values())
    .map((demo: any) => ({
      ...demo,
      ctr: demo.impressions > 0 ? (demo.clicks / demo.impressions) * 100 : 0
    }))
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 10) // Top 10 demographics

  // Aggregate geography
  const regionCounts = new Map()
  data.shopify_customers.forEach((customer: any) => {
    const region = customer.province || customer.city || 'Unknown'
    if (!regionCounts.has(region)) {
      regionCounts.set(region, { region, orders: 0, totalSpent: 0 })
    }
    const r = regionCounts.get(region)
    r.orders += 1
    r.totalSpent += Number(customer.total_spent) || 0
  })

  const topRegions = Array.from(regionCounts.values())
    .sort((a, b) => b.orders - a.orders)
    .slice(0, 5)

  return {
    summary: data.summary,
    top_ads: topAds,
    demographics: topDemographics,
    top_regions: topRegions,
    data_quality: {
      has_ad_data: data.meta_ads.length > 0,
      has_demographic_data: data.demographics.length > 0,
      has_customer_data: data.shopify_customers.length > 0
    }
  }
}
