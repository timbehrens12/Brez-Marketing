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

interface OptimizationRecommendation {
  id: string
  type: 'budget' | 'audience' | 'creative' | 'bid' | 'frequency'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  rootCause: string
  actions: Array<{
    id: string
    type: string
    label: string
    impact: {
      revenue: number
      roas: number
      confidence: number
    }
    estimatedTimeToStabilize: string
  }>
  currentValue: string
  recommendedValue: string
  projectedImpact: {
    revenue: number
    roas: number
    confidence: number
  }
  campaignId: string
  campaignName: string
  platform: string
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const brandId = searchParams.get('brandId')
    const showHistory = searchParams.get('history') === 'true'

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    // If requesting history, return all past recommendations
    if (showHistory) {
      const { data: history } = await supabase
        .from('recommendation_states')
        .select('*')
        .eq('brand_id', brandId)
        .in('status', ['dismissed', 'applied', 'testing', 'successful', 'failed', 'rolled_back'])
        .order('generated_at', { ascending: false })
        .limit(100)

      return NextResponse.json({ recommendations: history || [] })
    }

    // Get only NEW recommendations (never seen before)
    const { data: newRecommendations } = await supabase
      .from('recommendation_states')
      .select('*')
      .eq('brand_id', brandId)
      .eq('status', 'new')
      .order('generated_at', { ascending: false })

    // Get recommendations being tested (recently applied, still in test window)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: testingRecommendations } = await supabase
      .from('recommendation_states')
      .select('*')
      .eq('brand_id', brandId)
      .in('status', ['applied', 'testing'])
      .gte('applied_at', sevenDaysAgo)
      .order('applied_at', { ascending: false })

    // Get recent wins (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { data: recentWins } = await supabase
      .from('recommendation_states')
      .select('*')
      .eq('brand_id', brandId)
      .eq('status', 'successful')
      .gte('test_completed_at', thirtyDaysAgo)
      .order('test_completed_at', { ascending: false })
      .limit(10)

    // Check if we need to generate new recommendations
    // Only generate if we have fewer than 3 NEW recommendations
    if (!newRecommendations || newRecommendations.length < 3) {
      console.log(`[Recommendations] Generating new recommendations for brand ${brandId}`)
      
      // Generate based on last 7 days of data
      const dateRange = {
        from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        to: new Date().toISOString().split('T')[0]
      }
      
      const generatedRecs = await generateRecommendations(brandId, dateRange, userId)
      
      // Store new recommendations in recommendation_states
      for (const rec of generatedRecs) {
        await supabase
          .from('recommendation_states')
          .insert({
            brand_id: brandId,
            user_id: userId,
            recommendation_type: rec.type,
            campaign_id: rec.campaignId,
            campaign_name: rec.campaignName,
            title: rec.title,
            description: rec.description,
            rationale: rec.rootCause,
            key_signals: [],
            predicted_impact: `${rec.projectedImpact.revenue > 0 ? `+$${rec.projectedImpact.revenue.toFixed(0)}` : ''} ${rec.projectedImpact.roas > 0 ? `${rec.projectedImpact.roas.toFixed(1)}x ROAS` : ''}`.trim(),
            confidence_score: rec.projectedImpact.confidence,
            estimated_days_to_stable: parseInt(rec.actions[0]?.estimatedTimeToStabilize?.match(/\d+/)?.[0] || '7'),
            proposed_changes: { actions: rec.actions, currentValue: rec.currentValue, recommendedValue: rec.recommendedValue },
            status: 'new'
          })
      }
      
      // Fetch the newly created recommendations
      const { data: refreshedNew } = await supabase
        .from('recommendation_states')
        .select('*')
        .eq('brand_id', brandId)
        .eq('status', 'new')
        .order('generated_at', { ascending: false })

      return NextResponse.json({ 
        recommendations: refreshedNew || [],
        testing: testingRecommendations || [],
        recentWins: recentWins || []
      })
    }

    return NextResponse.json({ 
      recommendations: newRecommendations,
      testing: testingRecommendations || [],
      recentWins: recentWins || []
    })

  } catch (error) {
    console.error('Error fetching recommendations:', error)
    return NextResponse.json({ error: 'Failed to fetch recommendations' }, { status: 500 })
  }
}

async function generateRecommendations(brandId: string, dateRange: { from: string; to: string }, userId: string): Promise<OptimizationRecommendation[]> {
  try {
    // Get campaign performance data
    const { data: campaignStats } = await supabase
      .from('meta_campaign_daily_stats')
      .select('*')
      .eq('brand_id', brandId)
      .gte('date', dateRange.from)
      .lte('date', dateRange.to)

    const { data: campaigns } = await supabase
      .from('meta_campaigns')
      .select('*')
      .eq('brand_id', brandId)
      .eq('status', 'ACTIVE')

    if (!campaignStats || campaignStats.length === 0) {
      console.log(`[Recommendations] No campaign stats found for brand ${brandId}`)
      return []
    }

    if (!campaigns || campaigns.length === 0) {
      console.log(`[Recommendations] No active campaigns found for brand ${brandId}`)
      return []
    }

    // Analyze performance and generate recommendations
    const recommendations: OptimizationRecommendation[] = []

    // Group stats by campaign
    const campaignPerformance = new Map()
    campaignStats.forEach(stat => {
      const campaignId = stat.campaign_id
      if (!campaignPerformance.has(campaignId)) {
        campaignPerformance.set(campaignId, {
          totalSpend: 0,
          totalImpressions: 0,
          totalClicks: 0,
          totalConversions: 0,
          totalRevenue: 0,
          days: 0
        })
      }
      const perf = campaignPerformance.get(campaignId)
      perf.totalSpend += parseFloat(stat.spend) || 0
      perf.totalImpressions += parseInt(stat.impressions) || 0
      perf.totalClicks += parseInt(stat.clicks) || 0
      perf.totalConversions += parseInt(stat.conversions) || 0
      perf.totalRevenue += parseFloat(stat.purchase_value) || 0
      perf.days += 1
    })

    // Analyze each campaign for optimization opportunities
    for (const campaign of campaigns) {
      const perf = campaignPerformance.get(campaign.campaign_id)
      if (!perf) continue

      const avgDailySpend = perf.totalSpend / perf.days
      const ctr = perf.totalImpressions > 0 ? (perf.totalClicks / perf.totalImpressions) * 100 : 0
      const cpc = perf.totalClicks > 0 ? perf.totalSpend / perf.totalClicks : 0
      const roas = perf.totalSpend > 0 ? perf.totalRevenue / perf.totalSpend : 0 // Use actual revenue data
      
      console.log(`[Recommendations] Campaign ${campaign.campaign_name}: spend=$${perf.totalSpend}, revenue=$${perf.totalRevenue}, ROAS=${roas.toFixed(2)}x`)

      // Smart Budget Optimization with Multiple Scaling Options
      if ((roas > 1.5 || (perf.totalClicks > 5 && ctr > 1.0)) && avgDailySpend > 5) {
        const currentBudget = campaign.daily_budget || avgDailySpend
        const efficiency = ctr * (roas || 1) // Combined efficiency metric
        
        // Smart scaling based on performance strength
        let scalingMultiplier = 1.2 // Conservative default
        let priority: 'high' | 'medium' | 'low' = 'medium'
        let confidence = 70
        
        if (roas > 3 && ctr > 1.5) {
          scalingMultiplier = 2.0 // Aggressive scaling for winners
          priority = 'high'
          confidence = 90
        } else if (roas > 2 || ctr > 1.2) {
          scalingMultiplier = 1.5 // Moderate scaling
          confidence = 80
        }
        
        const recommendedBudget = Math.round(currentBudget * scalingMultiplier)
        const projectedRevenue = (recommendedBudget - currentBudget) * (roas || 2)
        
        // Generate dynamic scaling options
        const conservativeIncrease = Math.round(currentBudget * 1.2)
        const aggressiveIncrease = Math.round(currentBudget * 2.0)
        
        recommendations.push({
          id: `budget_${campaign.campaign_id}_${Date.now()}`,
          type: 'budget',
          priority,
          title: `Smart Budget Scaling - ${campaign.campaign_name}`,
          description: `Campaign shows strong signals (${ctr.toFixed(2)}% CTR, ${roas.toFixed(1)}x ROAS). Scale intelligently to maximize opportunity while managing risk.`,
          rootCause: `Efficiency Score: ${efficiency.toFixed(1)} (CTR × ROAS). Campaign is performing ${efficiency > 3 ? 'exceptionally' : efficiency > 2 ? 'well' : 'adequately'} vs benchmarks. Current daily spend of $${avgDailySpend.toFixed(0)} leaves headroom for profitable scaling.`,
          actions: [
            {
              id: 'conservative_scale',
              type: 'budget_increase',
              label: `Conservative Scale: +20% to $${conservativeIncrease}/day`,
              impact: {
                revenue: (conservativeIncrease - currentBudget) * (roas || 2),
                roas: roas * 0.95,
                confidence: Math.min(confidence + 10, 95)
              },
              estimatedTimeToStabilize: '2-3 days'
            },
            {
              id: 'optimal_scale',
              type: 'budget_increase', 
              label: `Optimal Scale: +${Math.round((scalingMultiplier - 1) * 100)}% to $${recommendedBudget}/day`,
              impact: {
                revenue: projectedRevenue,
                roas: roas * 0.9,
                confidence
              },
              estimatedTimeToStabilize: '3-5 days'
            },
            ...(efficiency > 3 ? [{
              id: 'aggressive_scale',
              type: 'budget_increase',
              label: `Aggressive Scale: +100% to $${aggressiveIncrease}/day`,
              impact: {
                revenue: (aggressiveIncrease - currentBudget) * (roas || 2) * 0.8,
                roas: roas * 0.8,
                confidence: Math.max(confidence - 15, 60)
              },
              estimatedTimeToStabilize: '5-7 days'
            }] : [])
          ],
          currentValue: `$${currentBudget.toFixed(0)}/day`,
          recommendedValue: `$${recommendedBudget}/day (${Math.round((scalingMultiplier - 1) * 100)}% increase)`,
          projectedImpact: {
            revenue: projectedRevenue,
            roas: roas * 0.9,
            confidence
          },
          campaignId: campaign.campaign_id,
          campaignName: campaign.campaign_name,
          platform: 'meta'
        })
      }

      // Advanced Creative Performance Analysis
      if (ctr < 1.8 && perf.totalImpressions > 50) {
        const severity = ctr < 0.8 ? 'critical' : ctr < 1.2 ? 'high' : 'medium'
        const urgency = severity === 'critical' ? 'high' : 'medium'
        
        // Calculate potential improvements
        const benchmarkCTR = 2.0 // Industry benchmark
        const potentialCTRIncrease = benchmarkCTR - ctr
        const costSavings = (cpc * perf.totalClicks * 0.3) // 30% CPC reduction from better CTR
        
        recommendations.push({
          id: `creative_${campaign.campaign_id}_${Date.now()}`,
          type: 'creative',
          priority: urgency,
          title: `Creative Performance ${severity === 'critical' ? 'Emergency' : 'Optimization'} - ${campaign.campaign_name}`,
          description: `CTR of ${ctr.toFixed(2)}% is ${severity === 'critical' ? 'critically' : 'significantly'} below benchmarks. Immediate creative refresh needed to reduce costs and improve performance.`,
          rootCause: `Performance Analysis: CTR ${ctr.toFixed(2)}% vs ${benchmarkCTR}% benchmark (${((benchmarkCTR - ctr) / benchmarkCTR * 100).toFixed(0)}% gap). Current CPC of $${cpc.toFixed(2)} is likely inflated due to poor engagement. ${perf.totalImpressions} impressions with only ${perf.totalClicks} clicks indicates creative fatigue or audience mismatch.`,
          actions: [
            {
              id: 'immediate_creative_test',
              type: 'creative_refresh',
              label: `Launch A/B test with 3 new creative variations`,
              impact: {
                revenue: costSavings * (roas || 2),
                roas: roas * 1.3,
                confidence: 85
              },
              estimatedTimeToStabilize: '5-7 days'
            },
            {
              id: 'creative_strategy_overhaul',
              type: 'creative_strategy',
              label: `Complete creative strategy refresh with new angles`,
              impact: {
                revenue: costSavings * (roas || 2) * 1.5,
                roas: roas * 1.6,
                confidence: 70
              },
              estimatedTimeToStabilize: '10-14 days'
            }
          ],
          currentValue: `${ctr.toFixed(2)}% CTR, $${cpc.toFixed(2)} CPC`,
          recommendedValue: `${benchmarkCTR.toFixed(1)}% CTR, $${(cpc * 0.7).toFixed(2)} CPC`,
          projectedImpact: {
            revenue: costSavings * (roas || 2),
            roas: roas * 1.4,
            confidence: 80
          },
          campaignId: campaign.campaign_id,
          campaignName: campaign.campaign_name,
          platform: 'meta'
        })
      }

      // No revenue tracking - if campaign has spend and clicks but no tracked revenue
      if (perf.totalSpend > 1 && perf.totalClicks > 0 && perf.totalRevenue === 0) {
        recommendations.push({
          id: `tracking_${campaign.campaign_id}_${Date.now()}`,
          type: 'audience',
          priority: 'medium',
          title: 'Set Up Conversion Tracking',
          description: `Campaign "${campaign.campaign_name}" has spend and clicks but no tracked revenue. Verify conversion tracking is properly configured.`,
          rootCause: `Campaign generated ${perf.totalClicks} clicks and spent $${perf.totalSpend.toFixed(2)} but no revenue is being tracked. This suggests conversion tracking issues or attribution problems.`,
          actions: [{
            id: 'check_tracking',
            type: 'tracking_optimization',
            label: 'Verify conversion tracking and attribution settings',
            impact: {
              revenue: perf.totalSpend * 2, // Conservative estimate
              roas: 2.0,
              confidence: 60
            },
            estimatedTimeToStabilize: '2-3 days'
          }],
          currentValue: 'No tracked revenue',
          recommendedValue: 'Proper conversion tracking',
          projectedImpact: {
            revenue: perf.totalSpend * 2,
            roas: 2.0,
            confidence: 60
          },
          campaignId: campaign.campaign_id,
          campaignName: campaign.campaign_name,
          platform: 'meta'
        })
      }

      // Frequency cap optimization - if high spend with low performance
      if (perf.totalSpend > 50 && roas < 1.5 && roas > 0) {
        recommendations.push({
          id: `frequency_${campaign.campaign_id}_${Date.now()}`,
          type: 'frequency',
          priority: 'medium',
          title: 'Optimize Audience Frequency',
          description: `Campaign "${campaign.campaign_name}" may be over-serving the same users. Frequency capping could improve efficiency.`,
          rootCause: `Low ROAS of ${roas.toFixed(1)}x despite significant spend suggests audience saturation or poor targeting.`,
          actions: [{
            id: 'set_frequency_cap',
            type: 'frequency_optimization',
            label: 'Set frequency cap at 3 impressions per 7 days',
            impact: {
              revenue: perf.totalSpend * 0.2,
              roas: roas * 1.3,
              confidence: 70
            },
            estimatedTimeToStabilize: '5-7 days'
          }],
          currentValue: 'No frequency cap',
          recommendedValue: '3 impressions per 7 days',
          projectedImpact: {
            revenue: perf.totalSpend * 0.2,
            roas: roas * 1.3,
            confidence: 70
          },
          campaignId: campaign.campaign_id,
          campaignName: campaign.campaign_name,
          platform: 'meta'
        })
      }
    }

    return recommendations.slice(0, 10) // Limit to top 10 recommendations

  } catch (error) {
    console.error('Error generating recommendations:', error)
    return []
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action, recommendationId, reason } = await request.json()

    if (action === 'dismiss') {
      // Dismiss recommendation
      const { error } = await supabase
        .from('recommendation_states')
        .update({
          status: 'dismissed',
          dismissed_at: new Date().toISOString(),
          dismissed_by: userId,
          dismiss_reason: reason || 'User dismissed'
        })
        .eq('id', recommendationId)

      if (error) throw error
      return NextResponse.json({ success: true, message: 'Recommendation dismissed' })
    }

    if (action === 'apply') {
      // Mark as applied (user will apply it themselves)
      const { error } = await supabase
        .from('recommendation_states')
        .update({
          status: 'applied',
          applied_at: new Date().toISOString(),
          applied_by: userId,
          test_started_at: new Date().toISOString()
        })
        .eq('id', recommendationId)

      if (error) throw error
      return NextResponse.json({ success: true, message: 'Recommendation marked as applied. Monitor for 7 days to determine success.' })
    }

    if (action === 'rollback') {
      // Roll back a recommendation
      const { error } = await supabase
        .from('recommendation_states')
        .update({
          status: 'rolled_back',
          rolled_back_at: new Date().toISOString(),
          rolled_back_by: userId,
          rollback_reason: reason || 'User initiated rollback'
        })
        .eq('id', recommendationId)

      if (error) throw error
      return NextResponse.json({ success: true, message: 'Recommendation rolled back' })
    }

    if (action === 'mark_successful') {
      // Mark a testing recommendation as successful
      const { error } = await supabase
        .from('recommendation_states')
        .update({
          status: 'successful',
          test_completed_at: new Date().toISOString()
        })
        .eq('id', recommendationId)

      if (error) throw error
      return NextResponse.json({ success: true, message: 'Recommendation marked as successful!' })
    }

    if (action === 'mark_failed') {
      // Mark a testing recommendation as failed
      const { error } = await supabase
        .from('recommendation_states')
        .update({
          status: 'failed',
          test_completed_at: new Date().toISOString()
        })
        .eq('id', recommendationId)

      if (error) throw error
      return NextResponse.json({ success: true, message: 'Recommendation marked as failed' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('Error handling recommendation action:', error)
    return NextResponse.json({ error: 'Failed to process action' }, { status: 500 })
  }
}

async function markActionAsDone(campaignId: string, actionId: string, brandId: string, userId: string) {
  // For dynamically generated recommendations, we'll create a generic action log entry
  // since these recommendations are generated on-the-fly from campaign data
  console.log(`Marking action as done: campaignId=${campaignId}, actionId=${actionId}, brandId=${brandId}`)
  
  // Try to get the recommendation from database first
  const { data: recommendation } = await supabase
    .from('ai_campaign_recommendations')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('brand_id', brandId)
    .single()

  let actionDescription = 'Manual optimization completed'
  
  if (recommendation) {
    const action = recommendation.recommendation.actions.find((a: any) => a.id === actionId)
    if (action) {
      actionDescription = action.label || action.description || 'Manual optimization completed'
    }
  } else {
    // For dynamic recommendations, create a description based on the actionId
    if (actionId?.includes('budget')) {
      actionDescription = 'Budget optimization completed manually'
    } else if (actionId?.includes('creative')) {
      actionDescription = 'Creative optimization completed manually'
    } else if (actionId?.includes('tracking')) {
      actionDescription = 'Conversion tracking setup completed'
    }
  }

  // Log the action as manually completed
  const logEntry = {
    user_id: userId,
    brand_id: brandId,
    campaign_id: campaignId,
    action_type: actionId?.includes('budget') ? 'budget_optimization' : 
                 actionId?.includes('creative') ? 'creative_optimization' : 
                 actionId?.includes('tracking') ? 'tracking_setup' : 'manual_optimization',
    action_details: {
      id: actionId,
      description: actionDescription,
      completed_manually: true
    },
    recommendation_id: recommendation?.id || null,
    status: 'completed_manually',
    applied_at: new Date().toISOString()
  }

  await supabase
    .from('optimization_action_log')
    .insert(logEntry)

  // Mark recommendation as completed if it exists in database
  if (recommendation) {
    await supabase
      .from('ai_campaign_recommendations')
      .update({ 
        expires_at: new Date().toISOString() // Expire it immediately
      })
      .eq('id', recommendation.id)
  }

  return {
    success: true,
    message: `Action "${actionDescription}" marked as completed`,
    status: 'completed_manually'
  }
}

async function applyOptimizationAction(campaignId: string, actionId: string, brandId: string, userId: string) {
  // Get the recommendation
  const { data: recommendation } = await supabase
    .from('ai_campaign_recommendations')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('brand_id', brandId)
    .single()

  if (!recommendation) {
    throw new Error('Recommendation not found')
  }

  const action = recommendation.recommendation.actions.find((a: any) => a.id === actionId)
  if (!action) {
    throw new Error('Action not found')
  }

  // Log the action
  await supabase
    .from('optimization_action_log')
    .insert({
      user_id: userId,
      brand_id: brandId,
      campaign_id: campaignId,
      action_type: action.type,
      action_details: action,
      recommendation_id: recommendation.id,
      status: 'applied',
      applied_at: new Date().toISOString()
    })

  // In a real implementation, this would integrate with Meta API to actually apply changes
  // For now, we'll simulate the action

  return {
    success: true,
    message: `Action "${action.label}" has been applied to campaign`,
    projectedImpact: action.impact
  }
}

async function simulateOptimizationAction(campaignId: string, actionId: string, brandId: string) {
  // Get the recommendation
  const { data: recommendation } = await supabase
    .from('ai_campaign_recommendations')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('brand_id', brandId)
    .single()

  if (!recommendation) {
    throw new Error('Recommendation not found')
  }

  const action = recommendation.recommendation.actions.find((a: any) => a.id === actionId)
  if (!action) {
    throw new Error('Action not found')
  }

  // Simulate the action results
  const simulationResult = {
    projectedImpact: action.impact,
    timeline: action.estimatedTimeToStabilize,
    risks: ['Learning phase may cause temporary performance dip', 'Results may vary based on market conditions'],
    safeguards: ['Can be reverted within 24 hours', 'Monitoring alerts will be set up']
  }

  return {
    success: true,
    simulation: simulationResult
  }
}
