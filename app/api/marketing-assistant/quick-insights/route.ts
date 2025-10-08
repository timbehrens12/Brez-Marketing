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

// Helper function to get Sunday-to-Sunday date range (last complete week)
function getSundayToSundayRange() {
  const now = new Date()
  const currentDay = now.getDay() // 0 = Sunday, 1 = Monday, etc.
  
  // Calculate days back to last Sunday (end of last week)
  const daysBackToSunday = currentDay === 0 ? 0 : currentDay
  
  // Get last Sunday (end of last week)
  const lastSunday = new Date(now)
  lastSunday.setDate(now.getDate() - daysBackToSunday)
  lastSunday.setHours(23, 59, 59, 999) // End of Sunday
  
  // Get the Sunday before that (start of last week)
  const previousSunday = new Date(lastSunday)
  previousSunday.setDate(lastSunday.getDate() - 7)
  previousSunday.setHours(0, 0, 0, 0) // Start of Sunday
  
  return {
    from: previousSunday.toISOString().split('T')[0],
    to: lastSunday.toISOString().split('T')[0]
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const brandId = searchParams.get('brandId')
    const forceGenerate = searchParams.get('forceGenerate') === 'true'
    
    // Use Sunday-to-Sunday date range (same as recommendations)
    const dateRange = getSundayToSundayRange()
    const fromDate = searchParams.get('from') || dateRange.from
    const toDate = searchParams.get('to') || dateRange.to
    
    const platforms = searchParams.get('platforms')?.split(',') || ['meta']

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    console.log(`[Quick Insights AI] 📅 Sunday-to-Sunday range: ${fromDate} to ${toDate}`)
    
    // Check for cached insights from this week
    const currentSunday = new Date(dateRange.from)
    const { data: cachedInsights, error: cacheError } = await supabase
      .from('ai_usage_logs')
      .select('response_data')
      .eq('brand_id', brandId)
      .eq('endpoint', 'quick_insights')
      .gte('created_at', currentSunday.toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    // Return cached insights if they exist and forceGenerate is not set
    if (!forceGenerate && cachedInsights && cachedInsights.response_data) {
      console.log(`[Quick Insights AI] Returning cached insights from this week`)
      const insights = typeof cachedInsights.response_data === 'string' 
        ? JSON.parse(cachedInsights.response_data) 
        : cachedInsights.response_data
      return NextResponse.json({ insights: insights.insights || insights })
    }

    console.log(`[Quick Insights AI] Generating new insights for brand ${brandId}`)
    const insights = await generateAIInsights(brandId, fromDate, toDate, platforms)
    
    // Cache the insights in ai_usage_logs
    await supabase.from('ai_usage_logs').insert({
      brand_id: brandId,
      user_id: userId,
      endpoint: 'quick_insights',
      response_data: { insights },
      created_at: new Date().toISOString()
    })
    
    console.log(`[Quick Insights AI] Generated and cached ${insights.length} AI-powered insights`)
    
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
    // Get Meta ad performance data
    const { data: insights } = await supabase
      .from('meta_ad_daily_insights')
      .select('ad_id, spent, impressions, clicks, date')
      .eq('brand_id', brandId)
      .gte('date', fromDate)
      .lte('date', toDate)
      .order('date', { ascending: false })
    
    // Get ad names from meta_ads table
    const uniqueAdIds = [...new Set(insights?.map(i => i.ad_id) || [])]
    const { data: ads } = await supabase
      .from('meta_ads')
      .select('ad_id, ad_name')
      .eq('brand_id', brandId)
      .in('ad_id', uniqueAdIds)
    
    // Create a map of ad_id to ad_name
    const adNameMap = new Map(ads?.map(ad => [ad.ad_id, ad.ad_name]) || [])
    
    // Combine insights with ad names
    const flattenedStats = insights?.map((stat: any) => ({
      ad_id: stat.ad_id,
      ad_name: adNameMap.get(stat.ad_id) || `Ad ${stat.ad_id}`,
      spent: stat.spent,
      impressions: stat.impressions,
      clicks: stat.clicks,
      date: stat.date
    })) || []
    
    performanceData.meta_ads = flattenedStats
    console.log(`[Quick Insights AI] Found ${flattenedStats.length} ad stats records with ${ads?.length || 0} ad names`)

    // Calculate summary metrics (use 'spent' not 'spend')
    if (flattenedStats && flattenedStats.length > 0) {
      performanceData.summary.totalSpend = flattenedStats.reduce((sum, s) => sum + (Number(s.spent) || 0), 0)
      performanceData.summary.totalImpressions = flattenedStats.reduce((sum, s) => sum + (Number(s.impressions) || 0), 0)
      performanceData.summary.totalClicks = flattenedStats.reduce((sum, s) => sum + (Number(s.clicks) || 0), 0)
      performanceData.summary.averageCTR = performanceData.summary.totalImpressions > 0
        ? (performanceData.summary.totalClicks / performanceData.summary.totalImpressions) * 100
        : 0
    }

    // Get demographic data (filtered by date range)
    const { data: demographics } = await supabase
      .from('meta_demographics')
      .select('breakdown_type, breakdown_value, spend, impressions, clicks, date_range_start, date_range_end')
      .eq('brand_id', brandId)
      .gte('date_range_start', fromDate)
      .lte('date_range_end', toDate)
    
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
  if (performanceData.meta_ads.length === 0 && performanceData.shopify_customers.length === 0 && performanceData.demographics.length === 0) {
    console.log('[Quick Insights AI] ❌ No data available - cannot generate insights')
    console.log('[Quick Insights AI] Meta ads:', performanceData.meta_ads.length)
    console.log('[Quick Insights AI] Demographics:', performanceData.demographics.length)
    console.log('[Quick Insights AI] Shopify customers:', performanceData.shopify_customers.length)
    return []
  }

  console.log('[Quick Insights AI] 📊 Data summary:')
  console.log(`  - Meta ads: ${performanceData.meta_ads.length} records`)
  console.log(`  - Demographics: ${performanceData.demographics.length} records`)
  console.log(`  - Shopify customers: ${performanceData.shopify_customers.length} customers`)
  console.log(`  - Total spend: $${performanceData.summary.totalSpend.toFixed(2)}`)
  console.log(`  - Total impressions: ${performanceData.summary.totalImpressions}`)
  console.log(`  - Average CTR: ${performanceData.summary.averageCTR.toFixed(2)}%`)

  // Prepare data summary for AI (limit data sent to avoid token limits)
  const dataSummary = prepareDataSummaryForAI(performanceData)

  console.log('[Quick Insights AI] 🤖 Sending to GPT-4 for analysis...')

  // Call OpenAI to generate insights
  let completion
  try {
    completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo', // Fastest model - critical to stay under 15s Vercel timeout
    messages: [
      {
        role: 'system',
        content: `You are a marketing analytics AI assistant. Analyze the provided brand performance data and generate EXACTLY 3 actionable insights based ONLY on the data that is actually available.

CRITICAL RULES:
1. Generate EXACTLY 3 insights, no more, no less
2. ONLY generate insights for data that actually exists in the provided dataset
3. Each insight should be SPECIFIC and NAME-DRIVEN (use actual ad names, demographics, campaigns, etc.)
4. Focus on ACTIONABLE findings with real numbers and metrics
5. Each insight MUST have:
   - type: snake_case identifier (e.g., "top_ad", "best_demographic", "high_ctr_campaign", "cost_efficient_adset")
   - label: Short category name (2-3 words max, e.g., "Top Ad", "Best Audience", "High CTR")
   - value: The key finding with SPECIFIC NAME (max 35 chars) - use ACTUAL names from data
   - metric: Supporting metric with real numbers (e.g., "2.5% CTR, $450 spent", "65+ age, 3.2% CTR")
   - icon: Single emoji that represents the insight
   - platform: "meta" or "google" or "tiktok" depending on data source

WHAT TO GENERATE INSIGHTS FOR (choose 3 from available data):

**IF top_ads EXISTS AND HAS DATA:**
- Generate insight about the best performing ad creative
- type: "top_ad"
- label: "Top Ad"
- value: Use EXACT ad_name from top_ads[0]
- metric: Show CTR and spend from that ad

**IF demographics EXISTS AND HAS DATA:**
- Generate insight about the best performing audience segment
- type: "top_demographic"
- label: "Top Audience"
- value: Use EXACT breakdown_value (e.g., "65+", "female", "18-24")
- metric: Show CTR and spend for that demographic

**IF top_regions EXISTS AND HAS DATA:**
- Generate insight about geographic performance
- type: "top_region"
- label: "Top Region"
- value: Use EXACT region/city name
- metric: Show orders and revenue

**IF top_campaigns EXISTS AND HAS DATA:**
- Generate insight about campaign performance
- type: "top_campaign"
- label: "Top Campaign"
- value: Use EXACT campaign name
- metric: Show ROAS and spend

**IF top_adsets EXISTS AND HAS DATA:**
- Generate insight about ad set performance
- type: "top_adset"
- label: "Best Ad Set"
- value: Use EXACT adset name
- metric: Show CTR and conversions

**IF spend_efficiency EXISTS:**
- Generate insight about cost efficiency
- type: "cost_efficiency"
- label: "Best CPC"
- value: Show lowest cost per click with ad/campaign name
- metric: Show CPC and total spend

**IF high_engagement EXISTS:**
- Generate insight about engagement
- type: "high_engagement"
- label: "Most Engaging"
- value: Show item with highest CTR
- metric: Show CTR and impressions

CRITICAL DATA USAGE RULES:
- NEVER generate an insight if the data category is empty or doesn't exist
- NEVER make up ad names, demographics, regions, campaigns, or ad sets
- ALWAYS use EXACT values from the provided data arrays
- If a data category is missing/empty, skip it and choose a different insight type
- The "value" field MUST contain the actual name from the data, not a generic description
- If ad_name is null or empty, use "Unnamed Ad #{ad_id}"

EXAMPLE - If only ads and demographics have data:
[
  {"type": "top_ad", "label": "Top Ad", "value": "Summer Sale 2025", "metric": "3.2% CTR, $450 spent", "icon": "📈", "platform": "meta"},
  {"type": "top_demographic", "label": "Top Audience", "value": "25-34", "metric": "4.1% CTR, $280 spent", "icon": "👥", "platform": "meta"},
  {"type": "high_engagement", "label": "High CTR", "value": "Brand Awareness Campaign", "metric": "5.2% CTR, 12K views", "icon": "🎯", "platform": "meta"}
]

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
    "icon": "📊",
    "platform": "meta"
  }
]`
      }
    ],
    temperature: 0.2, // Lower = faster
    max_tokens: 300, // Minimal tokens for 3 insights
  })
  } catch (aiError: any) {
    console.error('[Quick Insights AI] ❌ OpenAI API Error:', aiError.message)
    console.error('[Quick Insights AI] Full error:', aiError)
    
    // Return fallback insights if AI fails
    if (performanceData.summary.totalSpend > 0) {
      console.log('[Quick Insights AI] Using fallback insights due to AI error')
      return [
        {
          type: 'total_spend',
          label: 'Total Investment',
          value: `$${performanceData.summary.totalSpend.toFixed(2)}`,
          metric: 'last 30 days',
          icon: '💰',
          platform: 'meta'
        },
        {
          type: 'total_reach',
          label: 'Total Reach',
          value: `${(performanceData.summary.totalImpressions / 1000).toFixed(1)}K`,
          metric: 'impressions',
          icon: '👁️',
          platform: 'meta'
        },
        {
          type: 'avg_ctr',
          label: 'Average CTR',
          value: `${performanceData.summary.averageCTR.toFixed(2)}%`,
          metric: 'click-through rate',
          icon: '📈',
          platform: 'meta'
        }
      ]
    }
    return []
  }

  let aiResponse = completion.choices[0].message.content?.trim() || '[]'
  console.log('[Quick Insights AI] 🤖 GPT Response:', aiResponse)

  // Strip markdown code blocks if present (```json ... ```)
  if (aiResponse.startsWith('```')) {
    aiResponse = aiResponse.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    console.log('[Quick Insights AI] 📝 Stripped markdown formatting')
  }

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
    ad.spend += Number(stat.spent) || 0 // Use 'spent' not 'spend'
    ad.impressions += Number(stat.impressions) || 0
    ad.clicks += Number(stat.clicks) || 0
    ad.days.push(stat.date)
  })

  // Calculate CTR for each ad
  const topAds = Array.from(adPerformance.values())
    .map((ad: any) => ({
      ad_name: ad.ad_name,
      spend: ad.spend,
      impressions: ad.impressions,
      clicks: ad.clicks,
      ctr: ad.impressions > 0 ? (ad.clicks / ad.impressions) * 100 : 0,
      cpc: ad.clicks > 0 ? ad.spend / ad.clicks : 0
    }))
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 3) // Top 3 ads only - minimize data for speed

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
      type: demo.type,
      value: demo.value,
      spend: demo.spend,
      impressions: demo.impressions,
      clicks: demo.clicks,
      ctr: demo.impressions > 0 ? (demo.clicks / demo.impressions) * 100 : 0
    }))
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 3) // Top 3 demographics only - minimize data for speed

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
    .slice(0, 2) // Top 2 regions only - minimize data for speed

  // Clearly indicate which data categories are available
  const summary = {
    date_range: data.summary.dateRange,
    total_spend: data.summary.totalSpend,
    total_impressions: data.summary.totalImpressions,
    total_clicks: data.summary.totalClicks,
    average_ctr: data.summary.averageCTR
  }

  // Only include data categories that have actual data
  const result: any = { summary }

  if (topAds.length > 0) {
    result.top_ads = topAds
  }

  if (topDemographics.length > 0) {
    result.demographics = topDemographics
  }

  if (topRegions.length > 0) {
    result.top_regions = topRegions
  }

  // Add data availability flags to help AI make decisions
  result.data_available = {
    ads: topAds.length > 0,
    demographics: topDemographics.length > 0,
    regions: topRegions.length > 0
  }

  return result
}
