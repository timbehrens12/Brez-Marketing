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

    const { brandId, campaignId, campaignData } = await request.json()
    
    if (!brandId || !campaignId || !campaignData) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // Initialize Supabase client
    const supabase = createClient()

    // Fetch additional campaign data from database
    const { data: campaign, error: campaignError } = await supabase
      .from('meta_campaigns')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('brand_id', brandId)
      .single()

    if (campaignError || !campaign) {
      console.error('Error fetching campaign:', campaignError)
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Fetch ad sets for this campaign
    const { data: adSets, error: adSetsError } = await supabase
      .from('meta_adsets')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('brand_id', brandId)

    if (adSetsError) {
      console.error('Error fetching ad sets:', adSetsError)
    }

    // Fetch ads for this campaign
    const { data: ads, error: adsError } = await supabase
      .from('meta_ads')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('brand_id', brandId)

    if (adsError) {
      console.error('Error fetching ads:', adsError)
    }

    // Calculate key metrics and benchmarks
    const metrics = calculateCampaignMetrics(campaignData, adSets || [], ads || [])
    
    // Generate AI recommendation
    const recommendation = await generateAIRecommendation(campaign, metrics, adSets || [], ads || [])

    return NextResponse.json({
      success: true,
      recommendation,
      metrics,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error generating campaign recommendation:', error)
    return NextResponse.json({ 
      error: 'Failed to generate recommendation',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

interface CampaignMetrics {
  performanceGrade: string
  budgetUtilization: number
  costEfficiency: string
  audienceReach: string
  conversionRate: number
  benchmarkComparison: {
    ctr: string
    cpc: string
    roas: string
  }
  keyIssues: string[]
  strengths: string[]
}

function calculateCampaignMetrics(campaign: any, adSets: any[], ads: any[]): CampaignMetrics {
  const { spent, budget, impressions, clicks, conversions, ctr, cpc, roas } = campaign
  
  // Calculate budget utilization
  const budgetUtilization = budget > 0 ? (spent / budget) * 100 : 0
  
  // Calculate conversion rate
  const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0
  
  // Benchmark thresholds (industry standards)
  const benchmarks = {
    ctr: { good: 2.0, average: 1.0, poor: 0.5 },
    cpc: { good: 1.0, average: 2.0, poor: 4.0 },
    roas: { good: 4.0, average: 2.0, poor: 1.0 }
  }

  // Performance grading
  let performanceScore = 0
  if (ctr >= benchmarks.ctr.good) performanceScore += 3
  else if (ctr >= benchmarks.ctr.average) performanceScore += 2
  else performanceScore += 1

  if (cpc <= benchmarks.cpc.good) performanceScore += 3
  else if (cpc <= benchmarks.cpc.average) performanceScore += 2
  else performanceScore += 1

  if (roas >= benchmarks.roas.good) performanceScore += 3
  else if (roas >= benchmarks.roas.average) performanceScore += 2
  else performanceScore += 1

  const performanceGrade = performanceScore >= 8 ? 'Excellent' : 
                          performanceScore >= 6 ? 'Good' : 
                          performanceScore >= 4 ? 'Average' : 'Poor'

  // Cost efficiency assessment
  const costEfficiency = cpc <= benchmarks.cpc.good ? 'Efficient' :
                        cpc <= benchmarks.cpc.average ? 'Moderate' : 'Inefficient'

  // Audience reach assessment
  const audienceReach = impressions > 100000 ? 'Excellent' :
                       impressions > 50000 ? 'Good' :
                       impressions > 10000 ? 'Average' : 'Limited'

  // Identify key issues
  const keyIssues = []
  if (ctr < benchmarks.ctr.average) keyIssues.push('Low click-through rate')
  if (cpc > benchmarks.cpc.average) keyIssues.push('High cost per click')
  if (roas < benchmarks.roas.average) keyIssues.push('Low return on ad spend')
  if (budgetUtilization < 50) keyIssues.push('Under-utilizing budget')
  if (budgetUtilization > 90) keyIssues.push('Budget nearly exhausted')
  if (conversions < 10) keyIssues.push('Low conversion volume')

  // Identify strengths
  const strengths = []
  if (ctr >= benchmarks.ctr.good) strengths.push('Strong engagement rate')
  if (cpc <= benchmarks.cpc.good) strengths.push('Cost-effective clicks')
  if (roas >= benchmarks.roas.good) strengths.push('High return on investment')
  if (impressions > 100000) strengths.push('Excellent reach')
  if (conversionRate > 5) strengths.push('High conversion rate')

  return {
    performanceGrade,
    budgetUtilization,
    costEfficiency,
    audienceReach,
    conversionRate,
    benchmarkComparison: {
      ctr: ctr >= benchmarks.ctr.good ? 'Above Average' : 
           ctr >= benchmarks.ctr.average ? 'Average' : 'Below Average',
      cpc: cpc <= benchmarks.cpc.good ? 'Excellent' : 
           cpc <= benchmarks.cpc.average ? 'Average' : 'Poor',
      roas: roas >= benchmarks.roas.good ? 'Excellent' : 
            roas >= benchmarks.roas.average ? 'Average' : 'Poor'
    },
    keyIssues,
    strengths
  }
}

async function generateAIRecommendation(campaign: any, metrics: CampaignMetrics, adSets: any[], ads: any[]) {
  const prompt = `
You are an expert Meta advertising strategist. Analyze the following campaign data and provide a specific, actionable recommendation.

Campaign: ${campaign.campaign_name}
Objective: ${campaign.objective}
Status: ${campaign.status}
Budget: $${campaign.budget} (${campaign.budget_type})
Spent: $${campaign.spent}
Budget Utilization: ${metrics.budgetUtilization.toFixed(1)}%

Performance Metrics:
- Impressions: ${campaign.impressions?.toLocaleString() || 0}
- Clicks: ${campaign.clicks?.toLocaleString() || 0}
- CTR: ${campaign.ctr?.toFixed(2) || 0}%
- CPC: $${campaign.cpc?.toFixed(2) || 0}
- Conversions: ${campaign.conversions || 0}
- Conversion Rate: ${metrics.conversionRate.toFixed(2)}%
- ROAS: ${campaign.roas?.toFixed(2) || 0}x

Performance Grade: ${metrics.performanceGrade}
Cost Efficiency: ${metrics.costEfficiency}
Audience Reach: ${metrics.audienceReach}

Key Issues: ${metrics.keyIssues.join(', ') || 'None'}
Strengths: ${metrics.strengths.join(', ') || 'None'}

Ad Sets: ${adSets.length} ad sets
Ads: ${ads.length} ads

Provide a recommendation in the following JSON format:
{
  "action": "One of: increase budget, reduce budget, increase cpc, reduce cpc, optimize targeting, pause campaign, leave as is",
  "reasoning": "Brief explanation of why this action is recommended",
  "impact": "Expected outcome of implementing this recommendation",
  "confidence": "Confidence level from 1-10",
  "implementation": "Step-by-step guide on how to implement this recommendation",
  "forecast": "Predicted performance changes after implementing the recommendation"
}

Focus on the most impactful single action that would improve campaign performance.
`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert Meta advertising strategist focused on providing actionable, data-driven recommendations. Always respond with valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 1000,
      temperature: 0.3
    })

    const recommendation = JSON.parse(response.choices[0].message.content || '{}')
    
    // Validate the recommendation structure
    if (!recommendation.action || !recommendation.reasoning) {
      throw new Error('Invalid recommendation format')
    }

    return recommendation

  } catch (error) {
    console.error('Error generating AI recommendation:', error)
    
    // Fallback to rule-based recommendation if AI fails
    return generateRuleBasedRecommendation(campaign, metrics)
  }
}

function generateRuleBasedRecommendation(campaign: any, metrics: CampaignMetrics) {
  const { spent, budget, ctr, cpc, roas, conversions, impressions } = campaign
  const { budgetUtilization, performanceGrade } = metrics

  // Rule-based logic for common scenarios
  if (roas < 1.5 && cpc > 3.0) {
    return {
      action: 'reduce cpc',
      reasoning: 'High cost per click with poor return on ad spend indicates inefficient bidding',
      impact: 'Lower CPC should improve cost efficiency and ROAS',
      confidence: 8,
      implementation: 'Reduce bid amounts by 15-20% and monitor performance for 3-5 days',
      forecast: 'Expected 20-30% improvement in cost efficiency within one week'
    }
  }

  if (ctr < 1.0 && impressions > 50000) {
    return {
      action: 'optimize targeting',
      reasoning: 'Low click-through rate despite good reach suggests targeting issues',
      impact: 'Better targeting should improve engagement and reduce wasted impressions',
      confidence: 7,
      implementation: 'Review audience demographics and interests, test narrower targeting options',
      forecast: 'Expected 25-40% improvement in CTR within two weeks'
    }
  }

  if (roas > 4.0 && budgetUtilization < 60) {
    return {
      action: 'increase budget',
      reasoning: 'Strong ROAS with low budget utilization indicates scalable opportunity',
      impact: 'Higher budget should generate more conversions at current efficiency',
      confidence: 9,
      implementation: 'Increase daily budget by 30-50% while monitoring CPA',
      forecast: 'Expected 40-60% increase in conversions with maintained efficiency'
    }
  }

  if (conversions < 5 && spent > budget * 0.8) {
    return {
      action: 'pause campaign',
      reasoning: 'Low conversion volume with high budget consumption indicates poor performance',
      impact: 'Pausing will prevent further budget waste while optimizing',
      confidence: 8,
      implementation: 'Pause campaign and review targeting, creative, and landing page',
      forecast: 'Stop budget drain and allow time for optimization'
    }
  }

  // Default recommendation
  return {
    action: 'leave as is',
    reasoning: 'Campaign performance is within acceptable ranges',
    impact: 'Continue monitoring current performance trends',
    confidence: 6,
    implementation: 'Monitor key metrics and be ready to adjust if performance changes',
    forecast: 'Maintain current performance levels'
  }
} 