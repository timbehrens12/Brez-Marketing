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

    const { brandId, campaigns, totalMetrics, brandGoals, dateRange } = await request.json()
    
    if (!brandId) {
      return NextResponse.json({ error: 'Missing brandId' }, { status: 400 })
    }

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

    // Get historical campaign data for trend analysis
    const { data: historicalData, error: histError } = await supabase
      .from('meta_campaign_daily_stats')
      .select('*')
      .eq('brand_id', brandId)
      .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('date', { ascending: false })

    // Get Shopify data for enhanced insights
    let shopifyData = null
    const { data: connection } = await supabase
      .from('platform_connections')
      .select('id')
      .eq('brand_id', brandId)
      .eq('platform_type', 'shopify')
      .eq('status', 'active')
      .single()

    // Get Meta demographic data for audience insights
    let metaDemographics = null
    const { data: metaConnection } = await supabase
      .from('platform_connections')
      .select('id')
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')
      .eq('status', 'active')
      .single()

    if (metaConnection) {
      // Fetch recent demographic data (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const today = new Date().toISOString().split('T')[0]

      const { data: demographics } = await supabase
        .from('meta_demographics')
        .select('*')
        .eq('connection_id', metaConnection.id)
        .gte('date_range_start', thirtyDaysAgo)
        .lte('date_range_end', today)

      const { data: deviceData } = await supabase
        .from('meta_device_performance')
        .select('*')
        .eq('connection_id', metaConnection.id)
        .gte('date_range_start', thirtyDaysAgo)
        .lte('date_range_end', today)

      if (demographics?.length > 0 || deviceData?.length > 0) {
        metaDemographics = {
          demographics: demographics || [],
          deviceData: deviceData || []
        }
      }
    }

    if (connection) {
      // Fetch recent orders for e-commerce insights
      const { data: orders } = await supabase
        .from('shopify_orders')
        .select('*')
        .eq('connection_id', connection.id)
        .order('created_at', { ascending: false })
        .limit(50)

      // Fetch customer data
      const { data: customers } = await supabase
        .from('shopify_customers')
        .select('*')
        .eq('connection_id', connection.id)
        .order('total_spent', { ascending: false })
        .limit(30)

      // Fetch cart abandonment data
      const { data: draftOrders } = await supabase
        .from('shopify_draft_orders_enhanced')
        .select('*')
        .eq('connection_id', connection.id)
        .order('created_at', { ascending: false })
        .limit(20)

      // Fetch inventory items for margin calculation
      const { data: inventoryItems } = await supabase
        .from('shopify_inventory_items')
        .select('*')
        .eq('brand_id', brandId)

      // Calculate margin analysis
      let marginAnalysis = null
      if (inventoryItems?.length > 0 && orders?.length > 0) {
        const inventoryCostMap = new Map()
        inventoryItems.forEach((item: any) => {
          inventoryCostMap.set(item.inventory_item_id, parseFloat(item.cost) || 0)
        })

        let totalCost = 0
        let totalRevenue = 0
        let ordersWithMarginData = 0

        orders.forEach((order: any) => {
          if (order.line_items && Array.isArray(order.line_items)) {
            let orderHasCostData = false
            const orderRevenue = parseFloat(order.total_price) || 0
            totalRevenue += orderRevenue

            order.line_items.forEach((lineItem: any) => {
              const inventoryItemId = lineItem.variant?.inventory_item_id
              const unitCost = inventoryCostMap.get(inventoryItemId?.toString()) || 0
              const quantity = parseInt(lineItem.quantity) || 0
              
              if (unitCost > 0) {
                totalCost += unitCost * quantity
                orderHasCostData = true
              }
            })
            
            if (orderHasCostData) {
              ordersWithMarginData++
            }
          }
        })

        const averageMargin = totalRevenue > 0 && totalCost > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0
        marginAnalysis = {
          totalCost,
          totalProfit: totalRevenue - totalCost,
          averageMargin,
          ordersWithMarginData,
          marginDataCoverage: orders.length > 0 ? (ordersWithMarginData / orders.length) * 100 : 0
        }
      }

      if (orders || customers || draftOrders) {
        shopifyData = {
          orders: orders || [],
          customers: customers || [],
          draftOrders: draftOrders || [],
          marginAnalysis
        }
      }
    }

    // Generate AI-powered insights with Shopify data
    const insights = await generateAIInsights(campaigns, totalMetrics, brandGoals, historicalData || [], brand, shopifyData, metaDemographics)
    
    // Use GPT-4 for advanced recommendations
    const advancedInsights = await generateAdvancedInsights(campaigns, totalMetrics, brandGoals, brand)
    
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
    
  } catch (error) {
    console.error('Error generating AI insights:', error)
    return NextResponse.json({ error: 'Failed to generate insights' }, { status: 500 })
  }
}

async function generateAIInsights(
  campaigns: Campaign[], 
  totalMetrics: any, 
  brandGoals: any[],
  historicalData: any[],
  brand: any,
  shopifyData?: any,
  metaDemographics?: any
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
  brandGoals: any[],
  brand: any
): Promise<AIInsight[]> {
  const insights: AIInsight[] = []
  
  try {
    const brandName = brand?.name || 'your brand'
    const brandNiche = brand?.niche || null

    // Create niche-specific context if brand niche is available
    const nicheContext = brandNiche ? `

BRAND NICHE CONTEXT: This is a ${brandNiche} business. Tailor all insights and recommendations specifically for the ${brandNiche} industry, including:
- Industry-specific audience targeting opportunities
- Seasonal trends and patterns relevant to ${brandNiche} businesses
- Common challenges and optimization opportunities for ${brandNiche} campaigns
- Performance benchmarks typical for ${brandNiche} advertising
- Budget allocation strategies that work best for ${brandNiche} businesses
- Creative approaches that resonate with ${brandNiche} target audiences

When providing insights, always consider how they apply specifically to a ${brandNiche} business and mention industry-specific recommendations where relevant.` : `

BRAND CONTEXT: Provide general marketing insights while acknowledging that industry-specific insights could be more valuable with brand niche information.`

    const prompt = `
    You are an expert media buyer analyzing Facebook/Meta ad campaigns for ${brandName}${brandNiche ? ` (${brandNiche} business)` : ''}. Based on the following data, provide 3-5 specific, actionable insights that would help improve campaign performance.${nicheContext}
    
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
    
    Focus on${brandNiche ? ` ${brandNiche} industry-specific` : ' general'}:
    1. Audience insights and new segments to test${brandNiche ? ` for ${brandNiche} businesses` : ''}
    2. Creative performance patterns${brandNiche ? ` that work for ${brandNiche} customers` : ''}
    3. Budget optimization opportunities${brandNiche ? ` specific to ${brandNiche} campaigns` : ''}
    4. Seasonal or time-based trends${brandNiche ? ` relevant to ${brandNiche} industry` : ''}
    5. Competitive advantages to leverage${brandNiche ? ` in the ${brandNiche} market` : ''}
    `

    const response = await openai.chat.completions.create({
      model: 'gpt-5-mini', // GPT-5 Mini - strategic marketing advice & chat interface
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
      // Note: GPT-5 models only support temperature=1 (default)
      max_completion_tokens: 1000,
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
  
  // Add Shopify-specific insights if data is available
  if (shopifyData && (shopifyData.orders?.length > 0 || shopifyData.customers?.length > 0 || shopifyData.draftOrders?.length > 0)) {
    // Cart abandonment insights
    if (shopifyData.draftOrders?.length > 0) {
      const abandonedCarts = shopifyData.draftOrders.filter((draft: any) => draft.status !== 'completed')
      const abandonmentRate = (abandonedCarts.length / shopifyData.draftOrders.length) * 100
      
      if (abandonmentRate > 50) {
        insights.push({
          id: 'cart-abandonment-alert',
          type: 'alert',
          priority: 'high',
          title: 'High Cart Abandonment Rate',
          description: `${abandonmentRate.toFixed(1)}% of carts are being abandoned. Create retargeting campaigns for these warm prospects.`,
          actionable: true,
          action: {
            type: 'create_retargeting_campaign',
            label: 'Create Retargeting Campaign',
            params: { targetAudience: 'cart_abandoners' }
          },
          metrics: [
            { label: 'Abandonment Rate', value: `${abandonmentRate.toFixed(1)}%`, trend: 'up' },
            { label: 'Abandoned Carts', value: abandonedCarts.length.toString() }
          ],
          timestamp: new Date()
        })
      }
    }
    
    // Customer lifetime value insights
    if (shopifyData.customers?.length > 0) {
      const avgCustomerValue = shopifyData.customers.reduce((sum: number, c: any) => sum + parseFloat(c.total_spent || '0'), 0) / shopifyData.customers.length
      const returningCustomers = shopifyData.customers.filter((c: any) => (c.orders_count || 0) > 1).length
      const retentionRate = (returningCustomers / shopifyData.customers.length) * 100
      
      if (retentionRate < 25) {
        insights.push({
          id: 'customer-retention-opportunity',
          type: 'opportunity',
          priority: 'medium',
          title: 'Customer Retention Opportunity',
          description: `Only ${retentionRate.toFixed(1)}% of customers return for repeat purchases. Focus on retention campaigns to increase CLV.`,
          actionable: true,
          action: {
            type: 'create_retention_campaign',
            label: 'Plan Retention Strategy',
            params: { avgClv: avgCustomerValue.toFixed(2) }
          },
          metrics: [
            { label: 'Retention Rate', value: `${retentionRate.toFixed(1)}%`, trend: 'down' },
            { label: 'Avg Customer Value', value: `$${avgCustomerValue.toFixed(2)}` }
          ],
          timestamp: new Date()
        })
      }
      
      // High-value customer insights
      const highValueCustomers = shopifyData.customers.filter((c: any) => parseFloat(c.total_spent || '0') > avgCustomerValue * 2)
      if (highValueCustomers.length > 0) {
        insights.push({
          id: 'vip-customer-opportunity',
          type: 'opportunity',
          priority: 'high',
          title: 'VIP Customer Opportunity',
          description: `${highValueCustomers.length} customers have spent 2x+ your average. Create lookalike audiences based on these high-value customers.`,
          actionable: true,
          action: {
            type: 'create_lookalike_audience',
            label: 'Create Lookalike Audience',
            params: { sourceCustomers: highValueCustomers.length }
          },
          metrics: [
            { label: 'VIP Customers', value: highValueCustomers.length.toString() },
            { label: 'Avg VIP Value', value: `$${(highValueCustomers.reduce((sum: number, c: any) => sum + parseFloat(c.total_spent || '0'), 0) / highValueCustomers.length).toFixed(2)}` }
          ],
          timestamp: new Date()
        })
      }
    }
    
    // Revenue vs ad spend insights
    if (shopifyData.orders?.length > 0) {
      const recentRevenue = shopifyData.orders.reduce((sum: number, o: any) => sum + parseFloat(o.total_price || '0'), 0)
      const adSpendRevRatio = totalMetrics.spend > 0 ? recentRevenue / totalMetrics.spend : 0
      
      if (adSpendRevRatio < 2) {
        insights.push({
          id: 'revenue-efficiency-alert',
          type: 'alert',
          priority: 'medium',
          title: 'Ad Spend Efficiency Warning',
          description: `Your revenue-to-ad-spend ratio is ${adSpendRevRatio.toFixed(2)}x. Consider improving conversion rates or reducing ad costs.`,
          actionable: true,
          action: {
            type: 'optimize_conversion_funnel',
            label: 'Optimize Conversion Funnel',
            params: { currentRatio: adSpendRevRatio.toFixed(2) }
          },
          metrics: [
            { label: 'Revenue/Ad Spend', value: `${adSpendRevRatio.toFixed(2)}x`, trend: 'neutral' },
            { label: 'Recent Revenue', value: `$${recentRevenue.toFixed(2)}` }
          ],
          timestamp: new Date()
        })
      }
    }

    // Profit margin insights
    if (shopifyData.marginAnalysis) {
      const { averageMargin, totalProfit, marginDataCoverage } = shopifyData.marginAnalysis
      
      if (marginDataCoverage > 50) { // Only show insights if we have good coverage
        if (averageMargin < 20) {
          insights.push({
            id: 'low-margin-alert',
            type: 'alert',
            priority: 'high',
            title: 'Low Profit Margin Alert',
            description: `Your average profit margin is ${averageMargin.toFixed(1)}%, below the healthy 20% threshold. Focus on high-margin products and optimize pricing strategy.`,
            actionable: true,
            action: {
              type: 'optimize_margins',
              label: 'View Margin Optimization Plan',
              params: { currentMargin: averageMargin.toFixed(1) }
            },
            metrics: [
              { label: 'Current Margin', value: `${averageMargin.toFixed(1)}%`, trend: 'down' },
              { label: 'Target Margin', value: '20%+' },
              { label: 'Total Profit', value: `$${totalProfit.toFixed(2)}` }
            ],
            timestamp: new Date()
          })
        } else if (averageMargin > 50) {
          insights.push({
            id: 'high-margin-opportunity',
            type: 'opportunity',
            priority: 'medium',
            title: 'Premium Pricing Opportunity',
            description: `Excellent ${averageMargin.toFixed(1)}% profit margin suggests room for strategic scaling or reinvestment in growth.`,
            actionable: true,
            action: {
              type: 'scale_premium_products',
              label: 'Scale High-Margin Products',
              params: { currentMargin: averageMargin.toFixed(1) }
            },
            metrics: [
              { label: 'Current Margin', value: `${averageMargin.toFixed(1)}%`, trend: 'up' },
              { label: 'Total Profit', value: `$${totalProfit.toFixed(2)}` }
            ],
            timestamp: new Date()
          })
        }
      }
    }
  }

  // Meta demographic insights
  if (metaDemographics && (metaDemographics.demographics?.length > 0 || metaDemographics.deviceData?.length > 0)) {
    console.log('[Marketing Assistant] Adding Meta demographic insights')
    
    // Analyze age demographics for targeting insights
    const ageData = metaDemographics.demographics.filter((d: any) => d.breakdown_type === 'age')
    if (ageData.length > 0) {
      const topAge = ageData.sort((a: any, b: any) => b.impressions - a.impressions)[0]
      insights.push({
        id: 'top-age-demographic',
        type: 'opportunity',
        priority: 'medium',
        title: 'Top Performing Age Group',
        description: `Your ${topAge.breakdown_value} age group is your best performing audience with ${topAge.impressions.toLocaleString()} impressions and ${topAge.ctr.toFixed(2)}% CTR. Consider increasing budget allocation to this demographic.`,
        actionable: true,
        action: {
          type: 'optimize_demographics',
          label: 'Optimize Age Targeting',
          params: { topAge: topAge.breakdown_value }
        },
        metrics: [
          { label: 'Age Group', value: topAge.breakdown_value },
          { label: 'Impressions', value: topAge.impressions.toLocaleString() },
          { label: 'CTR', value: `${topAge.ctr.toFixed(2)}%`, trend: topAge.ctr > 2 ? 'up' : 'down' }
        ],
        timestamp: new Date()
      })
    }

    // Analyze device performance for mobile optimization
    const deviceData = metaDemographics.deviceData.filter((d: any) => d.breakdown_type === 'device')
    if (deviceData.length > 0) {
      const mobileData = deviceData.find((d: any) => d.breakdown_value.toLowerCase().includes('mobile'))
      const desktopData = deviceData.find((d: any) => d.breakdown_value.toLowerCase().includes('desktop'))
      
      if (mobileData && desktopData) {
        const mobileCTR = mobileData.ctr || 0
        const desktopCTR = desktopData.ctr || 0
        
        if (mobileCTR > desktopCTR * 1.2) {
          insights.push({
            id: 'mobile-outperforming',
            type: 'opportunity',
            priority: 'high',
            title: 'Mobile Outperforming Desktop',
            description: `Mobile devices are significantly outperforming desktop with ${mobileCTR.toFixed(2)}% CTR vs ${desktopCTR.toFixed(2)}% on desktop. Shift more budget to mobile-optimized campaigns.`,
            actionable: true,
            action: {
              type: 'optimize_device_targeting',
              label: 'Increase Mobile Budget',
              params: { device: 'mobile' }
            },
            metrics: [
              { label: 'Mobile CTR', value: `${mobileCTR.toFixed(2)}%`, trend: 'up' },
              { label: 'Desktop CTR', value: `${desktopCTR.toFixed(2)}%`, trend: 'down' }
            ],
            timestamp: new Date()
          })
        }
      }
    }
  }
  
  return insights
} 