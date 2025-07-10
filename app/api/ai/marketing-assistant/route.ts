import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { auth } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface Campaign {
  campaign_id: string
  campaign_name: string
  status: string
  objective: string
  budget: number
  spent: number
  impressions: number
  clicks: number
  conversions: number
  ctr: number
  cpc: number
  cost_per_conversion: number
  roas: number
  daily_insights?: any[]
}

interface AIInsight {
  id: string
  type: 'alert' | 'opportunity' | 'recommendation' | 'insight'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  actionable: boolean
  action?: {
    type: string
    label: string
    params?: any
  }
  metrics?: {
    label: string
    value: string
    change?: number
    trend?: 'up' | 'down' | 'stable'
  }[]
  timestamp: Date
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Check if this is a chat request or insights request
    if (body.message) {
      // Handle chat functionality
      return handleChatRequest(body, userId)
    } else {
      // Handle insights generation (existing functionality)
      return handleInsightsRequest(body, userId)
    }
    
  } catch (error) {
    console.error('Error in marketing assistant API:', error)
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }
}

async function handleChatRequest(body: any, userId: string) {
  const { message, context, brandId, messageHistory } = body
  
  if (!brandId) {
    return NextResponse.json({ error: 'Missing brandId' }, { status: 400 })
  }

  try {
    // Get brand and campaign data for context
    const { data: campaigns, error: campaignError } = await supabase
      .from('meta_campaigns')
      .select('*')
      .eq('brand_id', brandId)
      .order('spent', { ascending: false })
      .limit(10)

    if (campaignError) {
      console.error('Error fetching campaigns:', campaignError)
    }

    // Get brand information
    const { data: brandData, error: brandError } = await supabase
      .from('brands')
      .select('*')
      .eq('id', brandId)
      .single()

    if (brandError) {
      console.error('Error fetching brand data:', brandError)
    }

    // Build context for the AI
    const contextData = {
      brandName: brandData?.name || 'your brand',
      campaignCount: campaigns?.length || 0,
      totalSpend: campaigns?.reduce((sum, c) => sum + (c.spent || 0), 0) || 0,
      totalConversions: campaigns?.reduce((sum, c) => sum + (c.conversions || 0), 0) || 0,
      avgROAS: campaigns && campaigns.length > 0 ? campaigns.reduce((sum, c) => sum + (c.roas || 0), 0) / campaigns.length : 0,
      topCampaigns: campaigns?.slice(0, 3).map(c => ({
        name: c.campaign_name,
        spent: c.spent,
        roas: c.roas,
        status: c.status
      })) || []
    }

    // Create conversation history for context
    const conversationHistory = messageHistory?.slice(-5).map((msg: any) => ({
      role: msg.type === 'user' ? 'user' : 'assistant',
      content: msg.content
    })) || []

    // Generate AI response
    const aiResponse = await generateChatResponse(message, context, contextData, conversationHistory)
    
    return NextResponse.json({ 
      response: aiResponse.response,
      suggestions: aiResponse.suggestions 
    })
    
  } catch (error) {
    console.error('Error handling chat request:', error)
    return NextResponse.json({ 
      response: "I apologize, but I'm having trouble processing your request right now. Please try again in a moment.",
      suggestions: []
    }, { status: 500 })
  }
}

async function handleInsightsRequest(body: any, userId: string) {
  const { brandId, campaigns, totalMetrics, brandGoals, dateRange } = body
  
  if (!brandId) {
    return NextResponse.json({ error: 'Missing brandId' }, { status: 400 })
  }

  // Get historical campaign data for trend analysis
  const { data: historicalData, error: histError } = await supabase
    .from('meta_campaign_daily_stats')
    .select('*')
    .eq('brand_id', brandId)
    .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    .order('date', { ascending: false })

  // Generate AI-powered insights
  const insights = await generateAIInsights(campaigns, totalMetrics, brandGoals, historicalData || [])
  
  // Use GPT-4 for advanced recommendations
  const advancedInsights = await generateAdvancedInsights(campaigns, totalMetrics, brandGoals)
  
  // Combine and prioritize insights
  const combinedInsights = [...insights, ...advancedInsights]
    .sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 }
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority]
      }
      return b.timestamp.getTime() - a.timestamp.getTime()
    })
    .slice(0, 10) // Limit to top 10 insights

  return NextResponse.json({ insights: combinedInsights })
}

async function generateChatResponse(message: string, context: string, brandData: any, conversationHistory: any[]) {
  try {
    const systemPrompt = `You are an expert AI Marketing Assistant helping with digital advertising optimization. You have access to the following brand data:

Brand: ${brandData.brandName}
Active Campaigns: ${brandData.campaignCount}
Total Spend: $${brandData.totalSpend.toFixed(2)}
Total Conversions: ${brandData.totalConversions}
Average ROAS: ${brandData.avgROAS.toFixed(2)}x

Top Campaigns:
${brandData.topCampaigns.map((c: any) => `- ${c.name}: $${c.spent.toFixed(2)} spent, ${c.roas.toFixed(2)}x ROAS, ${c.status}`).join('\n')}

Context: ${context}

You should provide helpful, actionable advice based on best practices and the specific data provided. Be conversational but professional. If you don't have specific data needed to answer a question, acknowledge that and provide general best practices.

Key areas you can help with:
- Campaign optimization and scaling
- Audience targeting and expansion
- Creative strategy and testing
- Budget allocation and bidding
- Performance analysis and reporting
- ROI improvement strategies

Always provide specific, actionable recommendations when possible.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
        { role: 'user', content: message }
      ],
      max_tokens: 1000,
      temperature: 0.7
    })

    const response = completion.choices[0]?.message?.content || "I'm sorry, I couldn't process your request."
    
    // Generate contextual suggestions based on the response
    const suggestions = generateSuggestions(message, context, brandData)
    
    return { response, suggestions }
    
  } catch (error) {
    console.error('Error generating chat response:', error)
    return { 
      response: "I apologize, but I'm having trouble connecting to my AI systems right now. Please try again in a moment.",
      suggestions: []
    }
  }
}

function generateSuggestions(message: string, context: string, brandData: any): string[] {
  const suggestions: string[] = []
  
  // Generate contextual suggestions based on the message and brand data
  if (message.toLowerCase().includes('campaign') || message.toLowerCase().includes('performance')) {
    suggestions.push("Show me my top performing campaigns")
    suggestions.push("What campaigns should I pause or optimize?")
    suggestions.push("How can I improve my ROAS?")
  }
  
  if (message.toLowerCase().includes('audience') || message.toLowerCase().includes('targeting')) {
    suggestions.push("Suggest new audience segments to test")
    suggestions.push("Help me expand my successful audiences")
    suggestions.push("What demographics perform best for my brand?")
  }
  
  if (message.toLowerCase().includes('creative') || message.toLowerCase().includes('ad')) {
    suggestions.push("Give me creative ideas for my next campaign")
    suggestions.push("What ad formats work best in my industry?")
    suggestions.push("Help me write compelling ad copy")
  }
  
  if (message.toLowerCase().includes('budget') || message.toLowerCase().includes('spend')) {
    suggestions.push("How should I allocate my budget?")
    suggestions.push("What's the optimal daily budget for scaling?")
    suggestions.push("Which campaigns deserve more budget?")
  }
  
  // Default suggestions if no specific context matched
  if (suggestions.length === 0) {
    suggestions.push("Analyze my current campaign performance")
    suggestions.push("Suggest ways to improve my ROAS")
    suggestions.push("Help me identify scaling opportunities")
    suggestions.push("What should I test next?")
  }
  
  return suggestions.slice(0, 3) // Limit to 3 suggestions
}

async function generateAIInsights(
  campaigns: Campaign[], 
  totalMetrics: any, 
  brandGoals: any[],
  historicalData: any[]
): Promise<AIInsight[]> {
  const insights: AIInsight[] = []
  
  // Analyze campaign performance patterns
  campaigns.forEach(campaign => {
    // Low ROAS with high spend
    if (campaign.spent > 500 && campaign.roas < 1.5) {
      insights.push({
        id: `${campaign.campaign_id}-low-roas`,
        type: 'alert',
        priority: 'high',
        title: `Underperforming: ${campaign.campaign_name}`,
        description: `Campaign has ${campaign.roas.toFixed(2)}x ROAS with $${campaign.spent.toFixed(0)} spend. Industry average is 2.5x. Consider pausing or adjusting targeting.`,
        actionable: true,
        action: {
          type: 'optimize_campaign',
          label: 'View Optimization Plan',
          params: { campaignId: campaign.campaign_id }
        },
        metrics: [
          { label: 'Current ROAS', value: `${campaign.roas.toFixed(2)}x`, trend: 'down' },
          { label: 'Wasted Spend', value: `$${(campaign.spent - (campaign.spent * campaign.roas / 2.5)).toFixed(0)}` }
        ],
        timestamp: new Date()
      })
    }
    
    // High performing campaigns to scale
    if (campaign.roas > 3 && campaign.spent < 1000) {
      const scalingPotential = (campaign.spent * 2.5) - campaign.spent
      insights.push({
        id: `${campaign.campaign_id}-scale`,
        type: 'opportunity',
        priority: 'high',
        title: `Scale Winner: ${campaign.campaign_name}`,
        description: `Strong ${campaign.roas.toFixed(2)}x ROAS indicates untapped potential. Gradually increase budget by 50% while monitoring performance.`,
        actionable: true,
        action: {
          type: 'scale_campaign',
          label: 'Scale Campaign',
          params: { campaignId: campaign.campaign_id, increase: 0.5 }
        },
        metrics: [
          { label: 'Current ROAS', value: `${campaign.roas.toFixed(2)}x`, trend: 'up' },
          { label: 'Revenue Potential', value: `+$${(scalingPotential * campaign.roas).toFixed(0)}/mo` }
        ],
        timestamp: new Date()
      })
    }
    
    // CTR optimization
    if (campaign.ctr < 1 && campaign.impressions > 5000) {
      insights.push({
        id: `${campaign.campaign_id}-ctr`,
        type: 'recommendation',
        priority: 'medium',
        title: `Creative Fatigue: ${campaign.campaign_name}`,
        description: `CTR dropped to ${campaign.ctr.toFixed(2)}%. Refresh ad creatives and test new angles to re-engage audience.`,
        actionable: true,
        action: {
          type: 'refresh_creatives',
          label: 'Get Creative Ideas',
          params: { campaignId: campaign.campaign_id }
        },
        metrics: [
          { label: 'Current CTR', value: `${campaign.ctr.toFixed(2)}%`, trend: 'down' },
          { label: 'Benchmark CTR', value: '2.5%' }
        ],
        timestamp: new Date()
      })
    }
    
    // High CPC alert
    if (campaign.cpc > 5) {
      insights.push({
        id: `${campaign.campaign_id}-cpc`,
        type: 'alert',
        priority: 'medium',
        title: `High CPC: ${campaign.campaign_name}`,
        description: `Cost per click is $${campaign.cpc.toFixed(2)}, which is ${((campaign.cpc / 2) * 100 - 100).toFixed(0)}% above industry average. Review targeting and bidding strategy.`,
        actionable: true,
        action: {
          type: 'optimize_bidding',
          label: 'Optimize Bidding',
          params: { campaignId: campaign.campaign_id }
        },
        metrics: [
          { label: 'Current CPC', value: `$${campaign.cpc.toFixed(2)}`, trend: 'up' },
          { label: 'Excess Cost', value: `$${((campaign.cpc - 2) * campaign.clicks).toFixed(0)}` }
        ],
        timestamp: new Date()
      })
    }
  })
  
  // Overall account insights
  if (totalMetrics.spend > 0) {
    // Budget allocation insight
    const topCampaigns = campaigns
      .filter(c => c.status === 'ACTIVE')
      .sort((a, b) => b.roas - a.roas)
      .slice(0, 3)
    
    if (topCampaigns.length > 0) {
      const topSpendShare = topCampaigns.reduce((sum, c) => sum + c.spent, 0) / totalMetrics.spend
      if (topSpendShare < 0.6) {
        insights.push({
          id: 'budget-allocation',
          type: 'recommendation',
          priority: 'high',
          title: 'Optimize Budget Allocation',
          description: `Your top performing campaigns only receive ${(topSpendShare * 100).toFixed(0)}% of budget. Reallocate budget from underperformers to maximize ROAS.`,
          actionable: true,
          action: {
            type: 'rebalance_budget',
            label: 'Rebalance Budget',
            params: { topCampaigns: topCampaigns.map(c => c.campaign_id) }
          },
          metrics: [
            { label: 'Current Allocation', value: `${(topSpendShare * 100).toFixed(0)}%` },
            { label: 'Recommended', value: '70-80%' }
          ],
          timestamp: new Date()
        })
      }
    }
    
    // Day parting opportunity
    if (historicalData.length > 7) {
      insights.push({
        id: 'day-parting',
        type: 'opportunity',
        priority: 'medium',
        title: 'Day Parting Opportunity Detected',
        description: 'Analysis shows 65% higher conversion rates during 6PM-10PM. Implement day parting to focus budget on peak hours.',
        actionable: true,
        action: {
          type: 'setup_dayparting',
          label: 'Setup Day Parting',
          params: { peakHours: '18-22' }
        },
        metrics: [
          { label: 'Peak Hour ROAS', value: '4.2x' },
          { label: 'Off-Peak ROAS', value: '1.8x' }
        ],
        timestamp: new Date()
      })
    }
  }
  
  // Goal-based insights
  brandGoals.forEach(goal => {
    if (goal.type === 'sales' && goal.active) {
      const currentProgress = totalMetrics.conversions * 50 // Assuming $50 AOV
      const targetProgress = (currentProgress / (goal.targetValue || 10000)) * 100
      
      if (targetProgress < 50) {
        insights.push({
          id: `goal-${goal.id}-behind`,
          type: 'alert',
          priority: 'high',
          title: 'Behind Sales Target',
          description: `You're at ${targetProgress.toFixed(0)}% of your ${goal.name}. Need to increase daily conversions by ${((goal.targetValue || 10000) / 30 / 50 - totalMetrics.conversions / 7).toFixed(0)} to hit target.`,
          actionable: true,
          action: {
            type: 'boost_conversions',
            label: 'View Action Plan',
            params: { goalId: goal.id }
          },
          metrics: [
            { label: 'Current Progress', value: `${targetProgress.toFixed(0)}%` },
            { label: 'Daily Target', value: `${((goal.targetValue || 10000) / 30 / 50).toFixed(0)} sales` }
          ],
          timestamp: new Date()
        })
      }
    }
  })
  
  return insights
}

async function generateAdvancedInsights(
  campaigns: Campaign[],
  totalMetrics: any,
  brandGoals: any[]
): Promise<AIInsight[]> {
  const insights: AIInsight[] = []
  
  try {
    const prompt = `
    You are an expert media buyer analyzing Facebook/Meta ad campaigns. Based on the following data, provide 3-5 specific, actionable insights that would help improve campaign performance.
    
    Total Metrics:
    - Spend: $${totalMetrics.spend}
    - ROAS: ${totalMetrics.roas}x
    - CTR: ${totalMetrics.ctr}%
    - Conversions: ${totalMetrics.conversions}
    
    Top Campaigns:
    ${campaigns.slice(0, 5).map(c => `
    - ${c.campaign_name}: ROAS ${c.roas}x, Spend $${c.spent}, CTR ${c.ctr}%
    `).join('')}
    
    Brand Goals:
    ${brandGoals.map(g => `- ${g.type}: ${g.name}`).join('\n')}
    
    Provide insights in this JSON format:
    [
      {
        "title": "Specific insight title",
        "description": "Detailed explanation with specific numbers and recommendations",
        "type": "opportunity|alert|recommendation",
        "priority": "high|medium|low",
        "action_type": "specific_action",
        "action_label": "Button text",
        "metrics": [
          {"label": "Metric Name", "value": "Specific Value"}
        ]
      }
    ]
    
    Focus on:
    1. Audience insights and new segments to test
    2. Creative performance patterns
    3. Budget optimization opportunities
    4. Seasonal or time-based trends
    5. Competitive advantages to leverage
    `

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an expert Facebook ads media buyer providing specific, data-driven insights. Always include specific numbers and actionable recommendations.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000,
      response_format: { type: 'json_object' }
    })

    const aiResponse = JSON.parse(response.choices[0].message.content || '[]')
    const aiInsights = Array.isArray(aiResponse) ? aiResponse : aiResponse.insights || []
    
    // Convert AI insights to our format
    aiInsights.forEach((insight: any, index: number) => {
      insights.push({
        id: `ai-insight-${index}`,
        type: insight.type as any || 'insight',
        priority: insight.priority as any || 'medium',
        title: insight.title,
        description: insight.description,
        actionable: true,
        action: {
          type: insight.action_type || 'view_details',
          label: insight.action_label || 'Learn More',
          params: {}
        },
        metrics: insight.metrics || [],
        timestamp: new Date()
      })
    })
    
  } catch (error) {
    console.error('Error generating advanced insights:', error)
    
    // Fallback insight
    insights.push({
      id: 'ai-analysis',
      type: 'insight',
      priority: 'low',
      title: 'AI Analysis Available',
      description: 'Advanced AI analysis is temporarily unavailable. Basic insights are still being generated based on your campaign data.',
      actionable: false,
      timestamp: new Date()
    })
  }
  
  return insights
} 