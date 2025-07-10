import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface CampaignWithAI {
  id: string
  name: string
  platform: 'meta' | 'google' | 'tiktok'
  status: string
  objective: string
  spend: number
  revenue: number
  roas: number
  conversions: number
  ctr: number
  cpc: number
  impressions: number
  clicks: number
  aiRecommendation: {
    action: 'increase_budget' | 'decrease_budget' | 'pause' | 'optimize_creative' | 'expand_audience' | 'leave_as_is'
    confidence: number
    reason: string
    impact: string
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const url = new URL(request.url)
    const brandId = url.searchParams.get('brandId')
    const dateFrom = url.searchParams.get('dateFrom')
    const dateTo = url.searchParams.get('dateTo')
    
    if (!brandId) {
      return NextResponse.json({ error: 'Missing brandId parameter' }, { status: 400 })
    }

    const supabase = createClient()

    // Verify user has access to this brand
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('id')
      .eq('id', brandId)
      .eq('user_id', userId)
      .single()

    if (brandError || !brand) {
      return NextResponse.json({ error: 'Brand not found or access denied' }, { status: 403 })
    }

    const campaigns: CampaignWithAI[] = []

    // Get Meta campaigns
    let metaQuery = supabase
      .from('meta_campaigns')
      .select('campaign_id, campaign_name, status, objective, spent, impressions, clicks, conversions, roas, ctr, cpc')
      .eq('brand_id', brandId)
      .neq('status', 'DELETED')
      .order('spent', { ascending: false })

    // Apply date filters if provided
    if (dateFrom) {
      metaQuery = metaQuery.gte('start_date', dateFrom)
    }
    if (dateTo) {
      metaQuery = metaQuery.lte('start_date', dateTo)
    }

    const { data: metaCampaigns, error: metaError } = await metaQuery

    if (!metaError && metaCampaigns) {
      // Process Meta campaigns and generate AI recommendations
      for (const campaign of metaCampaigns) {
        const revenue = (campaign.spent || 0) * (campaign.roas || 0)
        
        const campaignData: CampaignWithAI = {
          id: campaign.campaign_id,
          name: campaign.campaign_name,
          platform: 'meta',
          status: campaign.status,
          objective: campaign.objective || 'CONVERSIONS',
          spend: campaign.spent || 0,
          revenue: revenue,
          roas: campaign.roas || 0,
          conversions: campaign.conversions || 0,
          ctr: campaign.ctr || 0,
          cpc: campaign.cpc || 0,
          impressions: campaign.impressions || 0,
          clicks: campaign.clicks || 0,
          aiRecommendation: await generateAIRecommendation(campaign)
        }

        campaigns.push(campaignData)
      }
    }

    // TODO: Add Google Ads campaigns when implemented
    // TODO: Add TikTok Ads campaigns when implemented

    return NextResponse.json({ 
      success: true,
      data: campaigns,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error fetching campaigns:', error)
    return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 })
  }
}

async function generateAIRecommendation(campaign: any): Promise<{
  action: 'increase_budget' | 'decrease_budget' | 'pause' | 'optimize_creative' | 'expand_audience' | 'leave_as_is'
  confidence: number
  reason: string
  impact: string
}> {
  try {
    const prompt = `
Analyze this Meta advertising campaign and provide a specific recommendation:

Campaign: ${campaign.campaign_name}
Status: ${campaign.status}
Objective: ${campaign.objective}
Spend: $${campaign.spent || 0}
ROAS: ${campaign.roas || 0}x
CTR: ${campaign.ctr || 0}%
CPC: $${campaign.cpc || 0}
Conversions: ${campaign.conversions || 0}
Impressions: ${campaign.impressions || 0}
Clicks: ${campaign.clicks || 0}

Based on industry benchmarks and best practices, provide ONE specific recommendation from these options:
- increase_budget: Scale profitable campaigns
- decrease_budget: Reduce spend on underperforming campaigns  
- pause: Stop campaigns that are losing money
- optimize_creative: Refresh creative due to fatigue
- expand_audience: Test broader targeting
- leave_as_is: Campaign is performing optimally

Provide your response in this exact JSON format:
{
  "action": "one of the above actions",
  "confidence": "number from 60-95",
  "reason": "brief explanation (max 100 chars)",
  "impact": "expected outcome (max 80 chars)"
}

Consider these benchmarks:
- Good ROAS: 3.0+ for e-commerce
- Good CTR: 1.0%+ for prospecting, 2.0%+ for retargeting
- Campaign fatigue: CTR declining over time
- Scale when: ROAS > 3.0 and CTR stable
`

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an expert Meta advertising strategist. Provide data-driven campaign recommendations in the exact JSON format requested. Keep responses concise and actionable."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 200,
      temperature: 0.3,
    })

    let recommendation
    try {
      recommendation = JSON.parse(completion.choices[0].message.content || '{}')
    } catch (parseError) {
      console.error('Error parsing AI recommendation:', parseError)
      // Fallback recommendation based on simple rules
      recommendation = generateFallbackRecommendation(campaign)
    }

    // Validate and ensure proper format
    if (!recommendation.action || !recommendation.confidence || !recommendation.reason || !recommendation.impact) {
      recommendation = generateFallbackRecommendation(campaign)
    }

    return recommendation

  } catch (error) {
    console.error('Error generating AI recommendation:', error)
    return generateFallbackRecommendation(campaign)
  }
}

function generateFallbackRecommendation(campaign: any): {
  action: 'increase_budget' | 'decrease_budget' | 'pause' | 'optimize_creative' | 'expand_audience' | 'leave_as_is'
  confidence: number
  reason: string
  impact: string
} {
  const roas = campaign.roas || 0
  const ctr = campaign.ctr || 0
  const spend = campaign.spent || 0

  // Simple rule-based recommendations
  if (roas >= 3.0 && ctr >= 1.0) {
    return {
      action: 'increase_budget',
      confidence: 85,
      reason: 'Strong ROAS and CTR indicate scaling opportunity',
      impact: 'Increased revenue with maintained efficiency'
    }
  } else if (roas < 1.5) {
    return {
      action: 'pause',
      confidence: 80,
      reason: 'Poor ROAS below profitability threshold',
      impact: 'Stop losses and reallocate budget'
    }
  } else if (ctr < 0.5) {
    return {
      action: 'optimize_creative',
      confidence: 75,
      reason: 'Low CTR suggests creative fatigue',
      impact: 'Improved engagement and lower costs'
    }
  } else if (roas >= 2.0 && roas < 3.0) {
    return {
      action: 'leave_as_is',
      confidence: 70,
      reason: 'Decent performance, monitor closely',
      impact: 'Maintain current trajectory'
    }
  } else {
    return {
      action: 'decrease_budget',
      confidence: 65,
      reason: 'Underperforming metrics need optimization',
      impact: 'Reduce spend while improving efficiency'
    }
  }
} 