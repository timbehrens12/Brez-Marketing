import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'
import { aiUsageService } from '@/lib/services/ai-usage-service'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { brandId, prompt, marketingGoal, userContext } = await request.json()
    
    if (!brandId || !prompt) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // Check AI usage status and daily limits
    const usageStatus = await aiUsageService.checkUsageStatus(
      brandId, 
      userId, 
      'ai_consultant_chat'
    )

    if (!usageStatus.canUse) {
      return NextResponse.json({ 
        error: 'Daily chat limit reached',
        reason: usageStatus.reason,
        remainingUses: usageStatus.remainingUses || 0
      }, { status: 429 })
    }

    // Initialize Supabase client
    const supabase = createClient()

    // Fetch brand information including niche
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('*')
      .eq('id', brandId)
      .eq('user_id', userId)
      .single()

    if (brandError || !brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
    }

    // Gather comprehensive 30-day data analysis
    const analysisData = await gatherComprehensiveMarketingData(supabase, brandId)
    
    // Generate personalized AI response with brand context
    const response = await generatePersonalizedResponse(prompt, analysisData, marketingGoal, userContext, brand)

    // Record chat usage
    await aiUsageService.recordUsage(
      brandId,
      userId,
      'ai_consultant_chat',
      {
        prompt: prompt.substring(0, 100), // Store first 100 chars for tracking
        marketingGoal,
        brandNiche: brand.niche || 'unspecified',
        timestamp: new Date().toISOString()
      }
    )

    // Get updated usage status to return remaining uses
    const updatedStatus = await aiUsageService.checkUsageStatus(
      brandId, 
      userId, 
      'ai_consultant_chat'
    )

    return NextResponse.json({
      success: true,
      response,
      remainingUses: updatedStatus.remainingUses || 0,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in marketing consultant:', error)
    return NextResponse.json({ 
      error: 'Failed to analyze data and generate response',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function gatherComprehensiveMarketingData(supabase: any, brandId: string) {
  const today = new Date()
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
  const todayStr = today.toISOString().split('T')[0]
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0]

  try {
    console.log('[AI Marketing Consultant] Fetching 30-day campaign data directly from database...')
    
    // Fetch campaign data from the database using the same logic as the metrics API
    const { data: campaigns } = await supabase
      .from('meta_campaigns')
      .select('*')
      .eq('brand_id', brandId)
      .order('spent', { ascending: false })

    // Fetch daily stats for trend analysis (30 days)
    const { data: dailyStats } = await supabase
      .from('meta_campaign_daily_stats')
      .select('*')
      .eq('brand_id', brandId)
      .gte('date', thirtyDaysAgoStr)
      .order('date', { ascending: false })

    console.log('[AI Marketing Consultant] Fetched campaign data:', {
      campaignCount: campaigns?.length || 0,
      dailyStatsCount: dailyStats?.length || 0
    })

    // Ensure campaigns is an array
    const campaignArray = campaigns || []
    const dailyStatsArray = dailyStats || []

    // Calculate aggregated metrics using the same logic as the dashboard
    const analysis = analyzeCampaignData(campaignArray, [], [], dailyStatsArray)

    console.log('[AI Marketing Consultant] Calculated 30-day analysis:', {
      totalSpend: analysis.totalSpend,
      totalRevenue: analysis.totalRevenue,
      averageROAS: analysis.averageROAS,
      activecampaigns: analysis.activecampaigns,
      topPerformersCount: analysis.topPerformers?.length || 0,
      underPerformersCount: analysis.underPerformers?.length || 0,
      dateRange: `${thirtyDaysAgoStr} to ${todayStr}`
    })

    return {
      campaigns: campaignArray,
      adSets: [], // Not needed for AI analysis
      ads: [], // Not needed for AI analysis  
      dailyStats: dailyStatsArray,
      analysis,
      dateRange: {
        from: thirtyDaysAgoStr,
        to: todayStr,
        days: 30
      }
    }

  } catch (error) {
    console.error('Error gathering marketing data:', error)
    return {
      campaigns: [],
      adSets: [],
      ads: [],
      dailyStats: [],
      analysis: {
        totalSpend: 0,
        totalRevenue: 0,
        averageROAS: 0,
        totalImpressions: 0,
        totalClicks: 0,
        averageCTR: 0,
        averageCPC: 0,
        activecampaigns: 0,
        trends: { improving: [], declining: [] },
        topPerformers: [],
        underPerformers: []
      },
      dateRange: {
        from: thirtyDaysAgoStr,
        to: todayStr,
        days: 30
      }
    }
  }
}

function analyzeCampaignData(campaigns: any[], adSets: any[], ads: any[], dailyStats: any[]) {
  // Calculate totals from 30-day daily stats instead of cumulative campaign data
  const totalSpend = dailyStats.reduce((sum, d) => sum + (d.spend || 0), 0)
  const totalRevenue = dailyStats.reduce((sum, d) => sum + (d.revenue || 0), 0)
  const totalImpressions = dailyStats.reduce((sum, d) => sum + (d.impressions || 0), 0)
  const totalClicks = dailyStats.reduce((sum, d) => sum + (d.clicks || 0), 0)
  
  // Calculate averages
  const averageROAS = totalSpend > 0 ? totalRevenue / totalSpend : 0
  const averageCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
  const averageCPC = totalClicks > 0 ? totalSpend / totalClicks : 0
  
  // Active campaigns
  const activecampaigns = campaigns.filter(c => c.status === 'ACTIVE').length
  
  // Performance analysis - aggregate daily stats by campaign for 30-day period
  const campaignPerformance = new Map()
  dailyStats.forEach(stat => {
    const campaignId = stat.campaign_id
    if (!campaignPerformance.has(campaignId)) {
      campaignPerformance.set(campaignId, {
        campaign_id: campaignId,
        campaign_name: stat.campaign_name,
        spend: 0,
        revenue: 0,
        impressions: 0,
        clicks: 0,
        status: 'ACTIVE'
      })
    }
    const perf = campaignPerformance.get(campaignId)
    perf.spend += stat.spend || 0
    perf.revenue += stat.revenue || 0
    perf.impressions += stat.impressions || 0
    perf.clicks += stat.clicks || 0
  })
  
  // Convert to array and calculate ROAS for 30-day period
  const activeCampaigns = Array.from(campaignPerformance.values())
    .filter(c => c.spend > 0)
    .map(c => ({ ...c, roas: c.spend > 0 ? c.revenue / c.spend : 0 }))
  
  // Sort by ROAS for performance categorization
  const sortedByROAS = activeCampaigns.sort((a, b) => (b.roas || 0) - (a.roas || 0))
  const topPerformers = sortedByROAS.slice(0, Math.ceil(sortedByROAS.length * 0.3))
  const underPerformers = sortedByROAS.slice(-Math.ceil(sortedByROAS.length * 0.3))
  
  // Trend analysis from daily stats
  const trends = analyzeTrends(dailyStats)
  
  // Ad Set Analysis
  const activeAdSets = adSets.filter(as => as.status === 'ACTIVE' && as.spent > 0)
  const topAdSets = activeAdSets.sort((a, b) => (b.roas || 0) - (a.roas || 0)).slice(0, 5)
  
  // Creative Analysis
  const activeAds = ads.filter(ad => ad.status === 'ACTIVE' && ad.spent > 0)
  const topAds = activeAds.sort((a, b) => (b.roas || 0) - (a.roas || 0)).slice(0, 10)
  
  // Budget Distribution Analysis - using 30-day data
  const campaignSpendDistribution = activeCampaigns.map(c => ({
    campaign: c.campaign_name,
    spend: c.spend,
    roas: c.roas,
    percentage: totalSpend > 0 ? (c.spend / totalSpend) * 100 : 0
  }))

  // Audience Performance (from ad sets)
  const audiencePerformance = activeAdSets.map(as => ({
    name: as.adset_name,
    targeting: as.targeting_expansion || 'Standard',
    roas: as.roas || 0,
    spend: as.spent || 0,
    ctr: as.ctr || 0
  }))

  return {
    totalSpend,
    totalRevenue,
    averageROAS,
    totalImpressions,
    totalClicks,
    averageCTR,
    averageCPC,
    activecampaigns: activecampaigns,
    trends,
    topPerformers,
    underPerformers,
    topAdSets,
    topAds,
    campaignSpendDistribution,
    audiencePerformance,
    // Additional insights
    costPerConversion: totalRevenue > 0 ? totalSpend / (totalRevenue / 50) : 0,
    impressionShare: totalImpressions,
    conversionRate: totalClicks > 0 ? ((totalRevenue / 50) / totalClicks) * 100 : 0
  }
}

function analyzeTrends(dailyStats: any[]) {
  if (dailyStats.length < 7) {
    return { improving: [], declining: [], stable: [] }
  }

  // Sort by date (most recent first)
  const sortedStats = dailyStats.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  
  // Compare last 7 days vs previous 7 days
  const recent7Days = sortedStats.slice(0, 7)
  const previous7Days = sortedStats.slice(7, 14)
  
  const recentAvgROAS = recent7Days.reduce((sum, s) => sum + (s.roas || 0), 0) / recent7Days.length
  const previousAvgROAS = previous7Days.length > 0 ? previous7Days.reduce((sum, s) => sum + (s.roas || 0), 0) / previous7Days.length : recentAvgROAS
  
  const recentAvgCTR = recent7Days.reduce((sum, s) => sum + (s.ctr || 0), 0) / recent7Days.length
  const previousAvgCTR = previous7Days.length > 0 ? previous7Days.reduce((sum, s) => sum + (s.ctr || 0), 0) / previous7Days.length : recentAvgCTR
  
  const recentAvgSpend = recent7Days.reduce((sum, s) => sum + (s.spend || 0), 0) / recent7Days.length
  const previousAvgSpend = previous7Days.length > 0 ? previous7Days.reduce((sum, s) => sum + (s.spend || 0), 0) / previous7Days.length : recentAvgSpend

  const trends = {
    improving: [] as string[],
    declining: [] as string[],
    stable: [] as string[]
  }

  // ROAS trend
  const roasChange = previousAvgROAS > 0 ? ((recentAvgROAS - previousAvgROAS) / previousAvgROAS) * 100 : 0
  if (roasChange > 10) trends.improving.push(`ROAS improved by ${roasChange.toFixed(1)}%`)
  else if (roasChange < -10) trends.declining.push(`ROAS declined by ${Math.abs(roasChange).toFixed(1)}%`)
  else trends.stable.push(`ROAS stable at ${recentAvgROAS.toFixed(1)}x`)

  // CTR trend
  const ctrChange = previousAvgCTR > 0 ? ((recentAvgCTR - previousAvgCTR) / previousAvgCTR) * 100 : 0
  if (ctrChange > 15) trends.improving.push(`CTR improved by ${ctrChange.toFixed(1)}%`)
  else if (ctrChange < -15) trends.declining.push(`CTR declined by ${Math.abs(ctrChange).toFixed(1)}%`)

  // Spend trend
  const spendChange = previousAvgSpend > 0 ? ((recentAvgSpend - previousAvgSpend) / previousAvgSpend) * 100 : 0
  if (Math.abs(spendChange) > 20) {
    const direction = spendChange > 0 ? 'increased' : 'decreased'
    trends.stable.push(`Spend ${direction} by ${Math.abs(spendChange).toFixed(1)}%`)
  }

  return trends
}

async function generatePersonalizedResponse(prompt: string, analysisData: any, marketingGoal: string, userContext: any, brand: any) {
  const { analysis, campaigns, adSets, ads, dateRange } = analysisData
  const userName = userContext?.name || 'there'
  const brandName = brand?.name || 'your brand'
  const brandNiche = brand?.niche || null

  // Define goal-specific contexts
  const goalContexts = {
    'general': 'Focus on overall performance optimization, ROI improvement, and general best practices',
    'holiday': 'Prioritize seasonal campaign strategies, increased budget allocation for peak periods, urgency-driven creatives, and holiday-specific audience targeting. Consider inventory management and higher competition during peak seasons',
    'lead-gen': 'Emphasize lead quality over immediate conversions, optimize for cost per lead, focus on top-of-funnel metrics, and recommend lead nurturing strategies. Prioritize broad reach and interest-based targeting',
    'product-launch': 'Focus on brand awareness, product education, early adopter targeting, and building initial momentum. Recommend awareness campaigns before conversion campaigns and progressive budget scaling',
    'brand-awareness': 'Prioritize reach, impressions, and brand recall metrics over immediate conversions. Focus on video content, broad targeting, and frequency management to build brand recognition',
    'retention': 'Focus on retargeting existing customers, lookalike audiences from high-value customers, and lifetime value optimization. Emphasize customer segments and cross-sell/upsell opportunities'
  }

  const goalContext = goalContexts[marketingGoal as keyof typeof goalContexts] || goalContexts.general

  // Create niche-specific context if brand niche is available
  const nicheContext = brandNiche ? `

BRAND NICHE CONTEXT: This is a ${brandNiche} business. Tailor all recommendations specifically for the ${brandNiche} industry, including:
- Industry-specific audience targeting strategies
- Relevant seasonal trends and opportunities for ${brandNiche} businesses
- Common pain points and objections specific to ${brandNiche} customers
- Competitive landscape considerations for the ${brandNiche} market
- Budget allocation strategies that work best for ${brandNiche} businesses
- Creative messaging that resonates with ${brandNiche} target audiences
- Performance benchmarks typical for ${brandNiche} advertising campaigns

When providing recommendations, always consider how they apply specifically to a ${brandNiche} business and mention industry-specific insights where relevant.` : `

BRAND CONTEXT: Provide general marketing recommendations while acknowledging that industry-specific insights could be more valuable with brand niche information.`

  const systemPrompt = `You are an expert marketing consultant providing personalized advice to ${userName} for ${brandName}. ${nicheContext}

MARKETING GOAL FOCUS: ${goalContext}

Your communication style:
- Address the user as ${userName} personally
- Be conversational and friendly, not formal
- Write in plain text without markdown formatting (no *, **, #, -, etc.)
- Use simple bullet points with • when listing items
- Provide specific, actionable recommendations tailored to their marketing goal${brandNiche ? ` and ${brandNiche} industry` : ''}
- Use data to support your advice but filter recommendations through their goal lens${brandNiche ? ` and industry context` : ''}
- Focus on ROI and practical next steps that align with their objective${brandNiche ? ` and ${brandNiche} business model` : ''}
- Keep responses comprehensive but digestible (400-600 words)
- Never end with formal closers like "Best regards", "Sincerely", etc.
- End naturally or with a simple encouragement
- Do not use asterisks, dashes, or other markdown symbols${brandNiche ? `
- Always contextualize recommendations for the ${brandNiche} industry when relevant` : ''}

Current Context:
- Brand: ${brandName}${brandNiche ? ` (${brandNiche} business)` : ''}
- Analysis Period: ${dateRange.days} days (${dateRange.from} to ${dateRange.to})
- Total Campaigns: ${campaigns.length} 
 - Active Campaigns: ${analysis.activecampaigns || 0}
- Total Ad Spend: $${(analysis.totalSpend || 0).toFixed(2)}
- Average ROAS: ${(analysis.averageROAS || 0).toFixed(2)}x
- Total Impressions: ${(analysis.totalImpressions || 0).toLocaleString()}
- Average CTR: ${(analysis.averageCTR || 0).toFixed(2)}%
- Average CPC: $${(analysis.averageCPC || 0).toFixed(2)}

Performance Trends:
${analysis.trends?.improving?.length > 0 ? `Improving: ${analysis.trends.improving.join(', ')}` : ''}
${analysis.trends?.declining?.length > 0 ? `Declining: ${analysis.trends.declining.join(', ')}` : ''}

Top Performing Campaigns:
${(analysis.topPerformers || []).map((c: any, i: number) => `${i+1}. ${c.campaign_name} - ${c.roas?.toFixed(1)}x ROAS, $${c.spent?.toFixed(0)} spent`).join('\n')}

Underperforming Campaigns:
${(analysis.underPerformers || []).map((c: any, i: number) => `${i+1}. ${c.campaign_name} - ${c.roas?.toFixed(1)}x ROAS, $${c.spent?.toFixed(0)} spent`).join('\n')}

Budget Distribution:
${(analysis.campaignSpendDistribution || []).slice(0, 5).map((c: any) => `${c.campaign}: ${c.percentage.toFixed(1)}% ($${c.spend.toFixed(0)})`).join('\n')}

Filter all recommendations through their marketing goal${brandNiche ? ` and ${brandNiche} industry context` : ''}. Provide specific campaign names, numbers, and actionable next steps based on this real data while keeping their objective${brandNiche ? ` and industry` : ''} as the primary focus.`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 1200,
      temperature: 0.7
    })

    return response.choices[0].message.content || `Hi ${userName}! I'd be happy to help analyze your ${brandName}${brandNiche ? ` ${brandNiche} business` : ''} marketing performance, but I'm having trouble generating a response right now. Please try again in a moment.`

  } catch (error) {
    console.error('Error generating AI response:', error)
    return `Hi ${userName}! I'm currently experiencing some technical difficulties analyzing your ${brandName} data. In the meantime, I can see you've spent $${(analysis.totalSpend || 0).toFixed(2)} across ${campaigns.length} campaigns with a ${(analysis.averageROAS || 0).toFixed(1)}x average ROAS. Please try your question again in a few moments!`
  }
} 