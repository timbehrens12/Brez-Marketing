import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { brandId } = await request.json()
    
    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    // Initialize Supabase client
    const supabase = createClient()

    // Gather data from all platforms
    const platformData = await gatherPlatformData(supabase, brandId)
    
    // Generate AI analysis
    const report = await generateDailyReport(platformData)

    return NextResponse.json({
      success: true,
      report,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error generating daily report:', error)
    return NextResponse.json({ 
      error: 'Failed to generate daily report',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

interface PlatformAnalysis {
  meta: {
    isConnected: boolean
    totalSpend: number
    totalROAS: number
    campaignCount: number
    activeCampaigns: number
    issues: string[]
    trends: {
      spendTrend: number
      roasTrend: number
    }
    topCampaigns: any[]
  }
  tiktok: {
    isConnected: boolean
    status: string
  }
  googleAds: {
    isConnected: boolean
    status: string
  }
}

async function gatherPlatformData(supabase: any, brandId: string): Promise<PlatformAnalysis> {
  const today = new Date()
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
  const fourteenDaysAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000)

  // Check platform connections
  const { data: connections } = await supabase
    .from('platform_connections')
    .select('platform_type, status')
    .eq('brand_id', brandId)

  const connectedPlatforms = connections?.reduce((acc: any, conn: any) => {
    acc[conn.platform_type] = conn.status === 'active'
    return acc
  }, {}) || {}

  // Analyze Meta data if connected
  let metaAnalysis = {
    isConnected: !!connectedPlatforms.meta,
    totalSpend: 0,
    totalROAS: 0,
    campaignCount: 0,
    activeCampaigns: 0,
    issues: [] as string[],
    trends: { spendTrend: 0, roasTrend: 0 },
    topCampaigns: []
  }

  if (connectedPlatforms.meta) {
    // Get campaign data
    const { data: campaigns } = await supabase
      .from('meta_campaigns')
      .select('*')
      .eq('brand_id', brandId)

    if (campaigns) {
      metaAnalysis.campaignCount = campaigns.length
      metaAnalysis.activeCampaigns = campaigns.filter((c: any) => c.status === 'ACTIVE').length
      metaAnalysis.totalSpend = campaigns.reduce((sum: number, c: any) => sum + (c.spent || 0), 0)
      metaAnalysis.totalROAS = campaigns.length > 0 
        ? campaigns.reduce((sum: number, c: any) => sum + (c.roas || 0), 0) / campaigns.length
        : 0

      // Get historical trends
      const { data: last7Days } = await supabase
        .from('meta_campaign_daily_stats')
        .select('*')
        .eq('brand_id', brandId)
        .gte('date', sevenDaysAgo.toISOString().split('T')[0])
        .lt('date', today.toISOString().split('T')[0])

      const { data: previous7Days } = await supabase
        .from('meta_campaign_daily_stats')
        .select('*')
        .eq('brand_id', brandId)
        .gte('date', fourteenDaysAgo.toISOString().split('T')[0])
        .lt('date', sevenDaysAgo.toISOString().split('T')[0])

      if (last7Days && previous7Days) {
        const lastWeekSpend = last7Days.reduce((sum: number, day: any) => sum + (day.spend || 0), 0)
        const prevWeekSpend = previous7Days.reduce((sum: number, day: any) => sum + (day.spend || 0), 0)
        metaAnalysis.trends.spendTrend = prevWeekSpend > 0 ? ((lastWeekSpend - prevWeekSpend) / prevWeekSpend) * 100 : 0

        const lastWeekROAS = last7Days.length > 0 
          ? last7Days.reduce((sum: number, day: any) => sum + (day.roas || 0), 0) / last7Days.length
          : 0
        const prevWeekROAS = previous7Days.length > 0 
          ? previous7Days.reduce((sum: number, day: any) => sum + (day.roas || 0), 0) / previous7Days.length
          : 0
        metaAnalysis.trends.roasTrend = prevWeekROAS > 0 ? ((lastWeekROAS - prevWeekROAS) / prevWeekROAS) * 100 : 0
      }

      // Identify issues
      const poorPerformingCampaigns = campaigns.filter((c: any) => c.roas < 2.0 && c.spent > 100)
      const highCostCampaigns = campaigns.filter((c: any) => c.cpc > 3.0)
      const lowCTRCampaigns = campaigns.filter((c: any) => c.ctr < 1.0)

      if (poorPerformingCampaigns.length > 0) {
        metaAnalysis.issues.push(`${poorPerformingCampaigns.length} campaigns with ROAS below 2.0`)
      }
      if (highCostCampaigns.length > 0) {
        metaAnalysis.issues.push(`${highCostCampaigns.length} campaigns with CPC above $3.00`)
      }
      if (lowCTRCampaigns.length > 0) {
        metaAnalysis.issues.push(`${lowCTRCampaigns.length} campaigns with CTR below 1.0%`)
      }

      // Top performing campaigns
      metaAnalysis.topCampaigns = campaigns
        .filter((c: any) => c.roas > 0)
        .sort((a: any, b: any) => b.roas - a.roas)
        .slice(0, 3)
    }
  }

  return {
    meta: metaAnalysis,
    tiktok: {
      isConnected: !!connectedPlatforms.tiktok,
      status: connectedPlatforms.tiktok ? 'active' : 'not_connected'
    },
    googleAds: {
      isConnected: !!connectedPlatforms.google_ads,
      status: connectedPlatforms.google_ads ? 'active' : 'not_connected'
    }
  }
}

async function generateDailyReport(platformData: PlatformAnalysis) {
  const { meta, tiktok, googleAds } = platformData

  // Determine overall health
  let overallHealth: 'excellent' | 'good' | 'fair' | 'poor' = 'poor'
  
  if (meta.isConnected) {
    if (meta.totalROAS >= 4.0 && meta.issues.length === 0) {
      overallHealth = 'excellent'
    } else if (meta.totalROAS >= 3.0 && meta.issues.length <= 1) {
      overallHealth = 'good'
    } else if (meta.totalROAS >= 2.0 && meta.issues.length <= 2) {
      overallHealth = 'fair'
    }
  }

  // Generate AI summary
  const aiSummary = await generateAISummary(platformData)
  
  // Platform statuses
  const platformStatuses = [
    {
      platform: 'Meta',
      logo: 'https://i.imgur.com/6hyyRrs.png',
      status: meta.isConnected 
        ? (meta.issues.length === 0 ? 'healthy' : meta.issues.length <= 2 ? 'attention' : 'critical')
        : 'inactive' as const,
      summary: meta.isConnected 
        ? `${meta.activeCampaigns} active campaigns, $${meta.totalSpend.toFixed(0)} spent, ${meta.totalROAS.toFixed(1)}x ROAS${meta.trends.roasTrend > 0 ? ' (trending up)' : meta.trends.roasTrend < -5 ? ' (trending down)' : ''}`
        : 'Platform not connected. Connect to start tracking performance.',
      keyMetrics: {
        spend: meta.totalSpend,
        performance: meta.trends.roasTrend,
        issues: meta.issues.length
      },
      recommendations: meta.isConnected ? generateMetaRecommendations(meta) : ['Connect Meta account to get started'],
      lastUpdated: new Date().toISOString()
    },
    {
      platform: 'TikTok',
      logo: 'https://i.imgur.com/AXHa9UT.png',
      status: 'inactive' as const,
      summary: 'Platform not connected. TikTok integration coming soon.',
      keyMetrics: { spend: 0, performance: 0, issues: 0 },
      recommendations: ['Stay tuned for TikTok Ads integration'],
      lastUpdated: new Date().toISOString()
    },
    {
      platform: 'Google Ads',
      logo: 'https://i.imgur.com/TavV4UJ.png',
      status: 'inactive' as const,
      summary: 'Platform not connected. Google Ads integration coming soon.',
      keyMetrics: { spend: 0, performance: 0, issues: 0 },
      recommendations: ['Stay tuned for Google Ads integration'],
      lastUpdated: new Date().toISOString()
    }
  ]

  // Generate priorities and highlights
  const topPriorities = generateTopPriorities(meta)
  const successHighlights = generateSuccessHighlights(meta)

  return {
    overallHealth,
    summary: aiSummary,
    totalSpend: meta.totalSpend,
    totalROAS: meta.totalROAS,
    platformStatuses,
    topPriorities,
    successHighlights,
    generatedAt: new Date().toISOString()
  }
}

function generateMetaRecommendations(meta: any): string[] {
  const recommendations = []
  
  if (meta.trends.roasTrend < -10) {
    recommendations.push('Review declining campaigns and pause poor performers')
  }
  if (meta.issues.length > 0) {
    recommendations.push('Address campaigns with performance issues')
  }
  if (meta.totalROAS > 4.0 && meta.trends.spendTrend < 0) {
    recommendations.push('Consider increasing budgets on high-performing campaigns')
  }
  if (meta.activeCampaigns < meta.campaignCount * 0.5) {
    recommendations.push('Reactivate paused campaigns with optimization')
  }
  
  return recommendations.slice(0, 3)
}

function generateTopPriorities(meta: any): string[] {
  const priorities = []
  
  if (!meta.isConnected) {
    priorities.push('Connect Meta advertising account to begin tracking')
    return priorities
  }
  
  if (meta.trends.roasTrend < -15) {
    priorities.push('Urgent: ROAS declining significantly - review campaign settings immediately')
  }
  if (meta.issues.includes('campaigns with ROAS below 2.0')) {
    priorities.push('Optimize or pause underperforming campaigns to reduce budget waste')
  }
  if (meta.issues.includes('campaigns with CPC above $3.00')) {
    priorities.push('Review bidding strategies for high-cost campaigns')
  }
  if (meta.activeCampaigns === 0) {
    priorities.push('No active campaigns - activate campaigns to start advertising')
  }
  
  return priorities.slice(0, 3)
}

function generateSuccessHighlights(meta: any): string[] {
  const highlights: string[] = []
  
  if (!meta.isConnected) return highlights
  
  if (meta.totalROAS >= 4.0) {
    highlights.push(`Excellent overall ROAS of ${meta.totalROAS.toFixed(1)}x across all campaigns`)
  }
  if (meta.trends.roasTrend > 10) {
    highlights.push(`ROAS trending up ${meta.trends.roasTrend.toFixed(1)}% week-over-week`)
  }
  if (meta.topCampaigns.length > 0 && meta.topCampaigns[0].roas > 5.0) {
    highlights.push(`Top campaign "${meta.topCampaigns[0].campaign_name}" achieving ${meta.topCampaigns[0].roas.toFixed(1)}x ROAS`)
  }
  if (meta.issues.length === 0 && meta.activeCampaigns > 0) {
    highlights.push('All active campaigns performing within healthy parameters')
  }
  
  return highlights.slice(0, 3)
}

async function generateAISummary(platformData: PlatformAnalysis): Promise<string> {
  const { meta } = platformData
  
  if (!meta.isConnected) {
    return "No advertising platforms connected. Connect Meta to start receiving AI-powered insights and recommendations for your campaigns."
  }

  const prompt = `
Summarize the advertising performance in 1-2 sentences based on this data:

Meta Advertising:
- Total Spend: $${meta.totalSpend.toFixed(2)}
- Average ROAS: ${meta.totalROAS.toFixed(2)}x
- Active Campaigns: ${meta.activeCampaigns} of ${meta.campaignCount}
- ROAS Trend: ${meta.trends.roasTrend > 0 ? '+' : ''}${meta.trends.roasTrend.toFixed(1)}%
- Spend Trend: ${meta.trends.spendTrend > 0 ? '+' : ''}${meta.trends.spendTrend.toFixed(1)}%
- Issues: ${meta.issues.join(', ') || 'None'}

Provide a brief, actionable summary focusing on the most important insights.
`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a marketing performance analyst. Provide clear, concise summaries focused on actionable insights.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 150,
      temperature: 0.3
    })

    return response.choices[0].message.content || generateFallbackSummary(meta)

  } catch (error) {
    console.error('Error generating AI summary:', error)
    return generateFallbackSummary(meta)
  }
}

function generateFallbackSummary(meta: any): string {
  if (!meta.isConnected) {
    return "No advertising platforms connected. Connect Meta to start receiving insights."
  }
  
  if (meta.totalROAS >= 4.0) {
    return `Strong performance with ${meta.totalROAS.toFixed(1)}x ROAS across ${meta.activeCampaigns} active campaigns. ${meta.issues.length > 0 ? 'Some optimization opportunities identified.' : 'All campaigns performing well.'}`
  } else if (meta.totalROAS >= 2.0) {
    return `Moderate performance with ${meta.totalROAS.toFixed(1)}x ROAS. ${meta.issues.length} areas need attention for improved efficiency.`
  } else {
    return `Performance below target with ${meta.totalROAS.toFixed(1)}x ROAS. Immediate optimization needed to improve campaign efficiency.`
  }
} 