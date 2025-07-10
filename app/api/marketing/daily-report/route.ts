import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface DailyReport {
  date: string
  summary: string
  platforms: {
    meta: { status: 'good' | 'warning' | 'critical', message: string }
    google?: { status: 'good' | 'warning' | 'critical', message: string }
    tiktok?: { status: 'good' | 'warning' | 'critical', message: string }
  }
  actionItems: Array<{
    priority: 'high' | 'medium' | 'low'
    title: string
    description: string
    platform?: string
  }>
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const url = new URL(request.url)
    const brandId = url.searchParams.get('brandId')
    
    if (!brandId) {
      return NextResponse.json({ error: 'Missing brandId parameter' }, { status: 400 })
    }

    const supabase = createClient()

    // Verify user has access to this brand
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('id, name')
      .eq('id', brandId)
      .eq('user_id', userId)
      .single()

    if (brandError || !brand) {
      return NextResponse.json({ error: 'Brand not found or access denied' }, { status: 403 })
    }

    // Get recent campaign data for analysis
    const { data: campaigns, error: campaignsError } = await supabase
      .from('meta_campaigns')
      .select('campaign_name, status, spent, roas, ctr, conversions, impressions, clicks')
      .eq('brand_id', brandId)
      .neq('status', 'DELETED')
      .order('spent', { ascending: false })
      .limit(10)

    if (campaignsError) {
      console.error('Error fetching campaigns for report:', campaignsError)
    }

    // Get recent performance data for trend analysis
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const { data: dailyStats, error: statsError } = await supabase
      .from('meta_campaign_daily_stats')
      .select('date, spend, conversions, roas')
      .eq('brand_id', brandId)
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: false })

    if (statsError) {
      console.error('Error fetching daily stats for report:', statsError)
    }

    // Generate AI-powered daily report
    const report = await generateDailyReport(brand, campaigns || [], dailyStats || [])

    return NextResponse.json({ 
      success: true,
      data: report,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error generating daily report:', error)
    return NextResponse.json({ error: 'Failed to generate daily report' }, { status: 500 })
  }
}

async function generateDailyReport(
  brand: any, 
  campaigns: any[], 
  dailyStats: any[]
): Promise<DailyReport> {
  try {
    // Calculate aggregate metrics
    const totalSpend = campaigns.reduce((sum, c) => sum + (c.spent || 0), 0)
    const totalConversions = campaigns.reduce((sum, c) => sum + (c.conversions || 0), 0)
    const avgRoas = campaigns.length > 0 ? 
      campaigns.reduce((sum, c) => sum + (c.roas || 0), 0) / campaigns.length : 0
    const avgCtr = campaigns.length > 0 ? 
      campaigns.reduce((sum, c) => sum + (c.ctr || 0), 0) / campaigns.length : 0

    // Analyze trends from daily stats
    const recentStats = dailyStats.slice(0, 7) // Last 7 days
    const previousStats = dailyStats.slice(7, 14) // Previous 7 days
    
    const recentAvgSpend = recentStats.length > 0 ? 
      recentStats.reduce((sum, s) => sum + (s.spend || 0), 0) / recentStats.length : 0
    const previousAvgSpend = previousStats.length > 0 ? 
      previousStats.reduce((sum, s) => sum + (s.spend || 0), 0) / previousStats.length : 0
    
    const spendTrend = previousAvgSpend > 0 ? 
      ((recentAvgSpend - previousAvgSpend) / previousAvgSpend) * 100 : 0

    const prompt = `
Generate a concise daily marketing report for ${brand.name}:

CURRENT PERFORMANCE:
- Total Spend: $${totalSpend.toFixed(2)}
- Total Conversions: ${totalConversions}
- Average ROAS: ${avgRoas.toFixed(2)}x
- Average CTR: ${avgCtr.toFixed(2)}%
- Spend Trend (7-day): ${spendTrend.toFixed(1)}%

ACTIVE CAMPAIGNS: ${campaigns.length}
Top campaigns by spend:
${campaigns.slice(0, 3).map(c => 
  `- ${c.campaign_name}: $${c.spent?.toFixed(2) || 0} spend, ${c.roas?.toFixed(2) || 0}x ROAS`
).join('\n')}

Generate a report in this exact JSON format:
{
  "summary": "2-3 sentence executive summary of overall performance",
  "metaStatus": "good|warning|critical",
  "metaMessage": "Brief status message for Meta platform (max 80 chars)",
  "actionItems": [
    {
      "priority": "high|medium|low",
      "title": "Action title (max 50 chars)",
      "description": "Action description (max 100 chars)",
      "platform": "meta"
    }
  ]
}

Status criteria:
- Good: ROAS > 2.5, CTR > 1.0%, positive trends
- Warning: ROAS 1.5-2.5, CTR 0.5-1.0%, mixed trends  
- Critical: ROAS < 1.5, CTR < 0.5%, negative trends

Focus on actionable insights and specific recommendations.
`

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an expert digital marketing analyst. Generate concise, actionable daily reports in the exact JSON format requested. Be specific and data-driven."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 400,
      temperature: 0.3,
    })

    let aiReport
    try {
      aiReport = JSON.parse(completion.choices[0].message.content || '{}')
    } catch (parseError) {
      console.error('Error parsing AI report:', parseError)
      aiReport = generateFallbackReport(avgRoas, avgCtr, spendTrend)
    }

    // Validate and format response
    const report: DailyReport = {
      date: new Date().toISOString().split('T')[0],
      summary: aiReport.summary || generateFallbackReport(avgRoas, avgCtr, spendTrend).summary,
      platforms: {
        meta: {
          status: aiReport.metaStatus || 'good',
          message: aiReport.metaMessage || 'Platform performing within expected ranges'
        }
      },
      actionItems: Array.isArray(aiReport.actionItems) ? aiReport.actionItems : []
    }

    return report

  } catch (error) {
    console.error('Error generating AI report:', error)
    return generateFallbackReport(2.0, 1.0, 0)
  }
}

function generateFallbackReport(avgRoas: number, avgCtr: number, spendTrend: number): DailyReport {
  let status: 'good' | 'warning' | 'critical' = 'good'
  let summary = 'Performance is stable with metrics within expected ranges.'
  
  if (avgRoas < 1.5 || avgCtr < 0.5) {
    status = 'critical'
    summary = 'Performance below targets. Immediate optimization needed.'
  } else if (avgRoas < 2.5 || avgCtr < 1.0) {
    status = 'warning'
    summary = 'Performance acceptable but has room for improvement.'
  }

  const actionItems = []
  
  if (avgRoas < 2.0) {
    actionItems.push({
      priority: 'high' as const,
      title: 'Improve ROAS Performance',
      description: 'Current ROAS below target. Review budget allocation and pause low performers.',
      platform: 'meta'
    })
  }
  
  if (avgCtr < 1.0) {
    actionItems.push({
      priority: 'medium' as const,
      title: 'Refresh Creative Assets',
      description: 'Low CTR suggests creative fatigue. Test new ad variations.',
      platform: 'meta'
    })
  }

  return {
    date: new Date().toISOString().split('T')[0],
    summary,
    platforms: {
      meta: {
        status,
        message: `Performance ${status}. ROAS: ${avgRoas.toFixed(1)}x, CTR: ${avgCtr.toFixed(1)}%`
      }
    },
    actionItems
  }
} 