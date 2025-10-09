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

  // Collect all available data at ALL LEVELS (campaign, adset, ad creative)
  const performanceData: any = {
    meta_campaigns: [],
    meta_adsets: [],
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
    // Get CAMPAIGN-level performance data
    const { data: campaignInsights } = await supabase
      .from('meta_campaign_daily_stats')
      .select('campaign_id, spend, impressions, clicks, roas, conversions, date')
      .eq('brand_id', brandId)
      .gte('date', fromDate)
      .lte('date', toDate)
    
    // Get campaign names
    const uniqueCampaignIds = [...new Set(campaignInsights?.map(i => i.campaign_id) || [])]
    const { data: campaigns } = await supabase
      .from('meta_campaigns')
      .select('campaign_id, campaign_name')
      .eq('brand_id', brandId)
      .in('campaign_id', uniqueCampaignIds)
    
    const campaignNameMap = new Map(campaigns?.map(c => [c.campaign_id, c.campaign_name]) || [])
    performanceData.meta_campaigns = campaignInsights?.map((stat: any) => ({
      campaign_id: stat.campaign_id,
      campaign_name: campaignNameMap.get(stat.campaign_id) || `Campaign ${stat.campaign_id}`,
      spend: stat.spend,
      impressions: stat.impressions,
      clicks: stat.clicks,
      roas: stat.roas,
      conversions: stat.conversions,
      date: stat.date
    })) || []
    console.log(`[Quick Insights AI] Found ${performanceData.meta_campaigns.length} campaign stats records`)

    // Get ADSET-level performance data
    const { data: adsetInsights } = await supabase
      .from('meta_adset_daily_insights')
      .select('adset_id, spent, impressions, clicks, conversions, date')
      .eq('brand_id', brandId)
      .gte('date', fromDate)
      .lte('date', toDate)
    
    // Get adset names
    const uniqueAdsetIds = [...new Set(adsetInsights?.map(i => i.adset_id) || [])]
    const { data: adsets } = await supabase
      .from('meta_adsets')
      .select('adset_id, adset_name')
      .eq('brand_id', brandId)
      .in('adset_id', uniqueAdsetIds)
    
    const adsetNameMap = new Map(adsets?.map(a => [a.adset_id, a.adset_name]) || [])
    performanceData.meta_adsets = adsetInsights?.map((stat: any) => ({
      adset_id: stat.adset_id,
      adset_name: adsetNameMap.get(stat.adset_id) || `Ad Set ${stat.adset_id}`,
      spent: stat.spent,
      impressions: stat.impressions,
      clicks: stat.clicks,
      conversions: stat.conversions,
      date: stat.date
    })) || []
    console.log(`[Quick Insights AI] Found ${performanceData.meta_adsets.length} adset stats records`)

    // Get AD CREATIVE-level performance data
    const { data: adInsights } = await supabase
      .from('meta_ad_daily_insights')
      .select('ad_id, spent, impressions, clicks, date')
      .eq('brand_id', brandId)
      .gte('date', fromDate)
      .lte('date', toDate)
    
    // Get ad names
    const uniqueAdIds = [...new Set(adInsights?.map(i => i.ad_id) || [])]
    const { data: ads } = await supabase
      .from('meta_ads')
      .select('ad_id, ad_name')
      .eq('brand_id', brandId)
      .in('ad_id', uniqueAdIds)
    
    const adNameMap = new Map(ads?.map(ad => [ad.ad_id, ad.ad_name]) || [])
    performanceData.meta_ads = adInsights?.map((stat: any) => ({
      ad_id: stat.ad_id,
      ad_name: adNameMap.get(stat.ad_id) || `Ad ${stat.ad_id}`,
      spent: stat.spent,
      impressions: stat.impressions,
      clicks: stat.clicks,
      date: stat.date
    })) || []
    console.log(`[Quick Insights AI] Found ${performanceData.meta_ads.length} ad creative stats records`)

    // Calculate summary metrics from campaign data (most complete)
    if (performanceData.meta_campaigns.length > 0) {
      performanceData.summary.totalSpend = performanceData.meta_campaigns.reduce((sum: number, s: any) => sum + (Number(s.spend) || 0), 0)
      performanceData.summary.totalImpressions = performanceData.meta_campaigns.reduce((sum: number, s: any) => sum + (Number(s.impressions) || 0), 0)
      performanceData.summary.totalClicks = performanceData.meta_campaigns.reduce((sum: number, s: any) => sum + (Number(s.clicks) || 0), 0)
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

  // If NO data at all, return empty array (NO FALLBACKS)
  const hasAnyData = performanceData.meta_campaigns.length > 0 || 
                     performanceData.meta_adsets.length > 0 || 
                     performanceData.meta_ads.length > 0 || 
                     performanceData.demographics.length > 0 || 
                     performanceData.shopify_customers.length > 0
  
  if (!hasAnyData) {
    console.log('[Quick Insights AI] ❌ NO DATA AVAILABLE - Cannot generate insights')
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
        content: `You are a marketing analytics AI assistant. Analyze the provided brand performance data and generate EXACTLY 5 actionable insights based ONLY on the data that is actually available.

CRITICAL RULES:
1. Generate EXACTLY 5 insights, no more, no less
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

WHAT TO GENERATE INSIGHTS FOR (choose 5 from available data):

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

EXAMPLE - Generate 5 diverse insights from available data:
[
  {"type": "top_ad", "label": "Top Ad", "value": "Summer Sale 2025", "metric": "3.2% CTR, $450 spent", "icon": "📈", "platform": "meta"},
  {"type": "top_demographic", "label": "Top Audience", "value": "25-34", "metric": "4.1% CTR, $280 spent", "icon": "👥", "platform": "meta"},
  {"type": "high_engagement", "label": "High CTR", "value": "Brand Awareness Campaign", "metric": "5.2% CTR, 12K views", "icon": "🎯", "platform": "meta"},
  {"type": "cost_efficiency", "label": "Best CPC", "value": "Retargeting Campaign", "metric": "$0.45 CPC, $120 spent", "icon": "💰", "platform": "meta"},
  {"type": "top_campaign", "label": "Top Campaign", "value": "Holiday Collection", "metric": "2.8x ROAS, $890 spent", "icon": "🚀", "platform": "meta"}
]

Return ONLY valid JSON array with exactly 5 insights, no explanation text.`
      },
      {
        role: 'user',
        content: `Analyze this brand's performance data and generate exactly 5 actionable insights:

${JSON.stringify(dataSummary, null, 2)}

Return exactly 5 insights in this JSON format:
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
    // NO FALLBACKS - Return empty array if AI fails
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
    
    // Ensure we have exactly 5 insights
    if (!Array.isArray(insights)) {
      console.error('[Quick Insights AI] ❌ AI did not return an array')
      return []
    }
    
    // Validate structure - must have all required fields
    insights = insights.filter((insight: any) => 
      insight.type && insight.label && insight.value && insight.metric && insight.icon
    ).slice(0, 5) // Take only first 5

    // NO FALLBACKS - If AI doesn't return exactly 5 valid insights, return empty
    if (insights.length < 5) {
      console.error(`[Quick Insights AI] ❌ AI returned only ${insights.length} insights, expected 5. Returning empty.`)
      return []
    }

    console.log(`[Quick Insights AI] ✅ Returning ${insights.length} insights:`, insights.map((i: any) => i.type))
    return insights

  } catch (parseError) {
    console.error('[Quick Insights AI] ❌ Failed to parse AI response:', parseError)
    console.error('[Quick Insights AI] Raw response:', aiResponse)
    // NO FALLBACKS - Return empty array if parsing fails
    return []
  }
}

function prepareDataSummaryForAI(data: any) {
  // Aggregate CAMPAIGN performance by campaign_id
  const campaignPerformance = new Map()
  data.meta_campaigns.forEach((stat: any) => {
    if (!campaignPerformance.has(stat.campaign_id)) {
      campaignPerformance.set(stat.campaign_id, {
        campaign_id: stat.campaign_id,
        campaign_name: stat.campaign_name || 'Unnamed Campaign',
        spend: 0,
        impressions: 0,
        clicks: 0,
        roas: 0,
        conversions: 0,
        days: []
      })
    }
    const campaign = campaignPerformance.get(stat.campaign_id)
    campaign.spend += Number(stat.spend) || 0
    campaign.impressions += Number(stat.impressions) || 0
    campaign.clicks += Number(stat.clicks) || 0
    campaign.roas += Number(stat.roas) || 0
    campaign.conversions += Number(stat.conversions) || 0
    campaign.days.push(stat.date)
  })

  const topCampaigns = Array.from(campaignPerformance.values())
    .map((campaign: any) => ({
      campaign_name: campaign.campaign_name,
      spend: campaign.spend,
      impressions: campaign.impressions,
      clicks: campaign.clicks,
      roas: campaign.roas / campaign.days.length, // Average ROAS
      conversions: campaign.conversions,
      ctr: campaign.impressions > 0 ? (campaign.clicks / campaign.impressions) * 100 : 0,
      cpc: campaign.clicks > 0 ? campaign.spend / campaign.clicks : 0
    }))
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 3) // Top 3 campaigns

  // Aggregate ADSET performance by adset_id
  const adsetPerformance = new Map()
  data.meta_adsets.forEach((stat: any) => {
    if (!adsetPerformance.has(stat.adset_id)) {
      adsetPerformance.set(stat.adset_id, {
        adset_id: stat.adset_id,
        adset_name: stat.adset_name || 'Unnamed Ad Set',
        spend: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        days: []
      })
    }
    const adset = adsetPerformance.get(stat.adset_id)
    adset.spend += Number(stat.spent) || 0
    adset.impressions += Number(stat.impressions) || 0
    adset.clicks += Number(stat.clicks) || 0
    adset.conversions += Number(stat.conversions) || 0
    adset.days.push(stat.date)
  })

  const topAdsets = Array.from(adsetPerformance.values())
    .map((adset: any) => ({
      adset_name: adset.adset_name,
      spend: adset.spend,
      impressions: adset.impressions,
      clicks: adset.clicks,
      conversions: adset.conversions,
      ctr: adset.impressions > 0 ? (adset.clicks / adset.impressions) * 100 : 0,
      cpc: adset.clicks > 0 ? adset.spend / adset.clicks : 0
    }))
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 3) // Top 3 adsets

  // Aggregate AD CREATIVE performance by ad_id
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
    ad.spend += Number(stat.spent) || 0
    ad.impressions += Number(stat.impressions) || 0
    ad.clicks += Number(stat.clicks) || 0
    ad.days.push(stat.date)
  })

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
    .slice(0, 3) // Top 3 ads

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

  if (topCampaigns.length > 0) {
    result.top_campaigns = topCampaigns
  }

  if (topAdsets.length > 0) {
    result.top_adsets = topAdsets
  }

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
    campaigns: topCampaigns.length > 0,
    adsets: topAdsets.length > 0,
    ads: topAds.length > 0,
    demographics: topDemographics.length > 0,
    regions: topRegions.length > 0
  }

  return result
}
