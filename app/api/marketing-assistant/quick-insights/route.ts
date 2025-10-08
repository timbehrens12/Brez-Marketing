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

// Helper function to get Monday-to-Monday date range
function getMondayToMondayRange() {
  const now = new Date()
  const currentDay = now.getDay() // 0 = Sunday, 1 = Monday, etc.
  
  // Calculate days back to last Monday
  const daysBackToMonday = currentDay === 0 ? 6 : currentDay - 1
  
  // Get last Monday
  const lastMonday = new Date(now)
  lastMonday.setDate(now.getDate() - daysBackToMonday - 7) // Go back one more week to get the previous Monday
  lastMonday.setHours(0, 0, 0, 0)
  
  // Get this Monday
  const thisMonday = new Date(now)
  thisMonday.setDate(now.getDate() - daysBackToMonday)
  thisMonday.setHours(0, 0, 0, 0)
  
  return {
    from: lastMonday.toISOString().split('T')[0],
    to: thisMonday.toISOString().split('T')[0]
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
    
    // Use Monday-to-Monday date range (same as recommendations)
    const dateRange = getMondayToMondayRange()
    const fromDate = searchParams.get('from') || dateRange.from
    const toDate = searchParams.get('to') || dateRange.to
    
    const platforms = searchParams.get('platforms')?.split(',') || ['meta']

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    console.log(`[Quick Insights AI] 📅 Monday-to-Monday range: ${fromDate} to ${toDate}`)
    console.log(`[Quick Insights AI] Generating insights for brand ${brandId}`)

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
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are a marketing analytics AI assistant. Analyze brand performance data and generate exactly 3 actionable insights.

CRITICAL RULES:
1. Generate EXACTLY 3 insights, no more, no less
2. Each insight should be SPECIFIC and NAME-DRIVEN (mention specific ad names, demographics, or regions)
3. Focus on ACTIONABLE findings, not generic metrics
4. Be specific with numbers and metrics
5. Each insight should have:
   - type: snake_case identifier (e.g., "top_ad", "best_demographic", "opportunity_region")
   - label: Short category name (2-3 words max)
   - value: The key finding with SPECIFIC NAME (max 35 chars) - e.g., "Spring Sale Ad" not "High CTR"
   - metric: Supporting metric with numbers (e.g., "2.5% CTR, $450 spent", "65+ age, 3.2% CTR")
   - icon: Single emoji that represents the insight
   - platform: "meta" (all insights are from Meta data for now)

PRIORITY INSIGHTS (MUST USE ACTUAL DATA):
1. **Top Ad Creative** - USE THE ACTUAL AD_NAME FROM top_ads[0]
   - type: "top_ad"
   - label: "Top Ad"
   - value: EXACT ad_name from data (e.g., the actual ad name like "TEST - DO NOT USE")
   - metric: Show CTR and spend, e.g., "2.5% CTR, $450 spent"

2. **Top Demographic** - USE THE ACTUAL breakdown_value FROM demographics
   - type: "top_demographic"
   - label: "Top Audience" 
   - value: EXACT breakdown_value (e.g., "65+" or "female")
   - metric: Show CTR and spend, e.g., "3.2% CTR, $320 spent"

3. **Geographic Leader** - USE THE ACTUAL region FROM top_regions
   - type: "top_region"
   - label: "Top Region"
   - value: EXACT region name from data
   - metric: Show orders and spend, e.g., "12 orders, $450 revenue"

CRITICAL RULES FOR DATA USAGE:
- NEVER make up ad names - use EXACT ad_name field from top_ads array
- NEVER make up demographics - use EXACT breakdown_value from demographics array
- NEVER make up regions - use EXACT region field from top_regions array
- The "value" field MUST contain the actual name/demographic/region from the data
- The "metric" field MUST show actual numbers (spend, CTR, orders) from the data
- If ad_name is null or empty, use "Unnamed Ad #{ad_id}"
- DO NOT use generic labels like "High Performing Ad" - use the ACTUAL name

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
    temperature: 0.7,
    max_tokens: 1000,
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
