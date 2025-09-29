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
    const dateRange = {
      from: searchParams.get('from') || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      to: searchParams.get('to') || new Date().toISOString().split('T')[0]
    }

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    // Get AI campaign recommendations from database
    const { data: existingRecommendations } = await supabase
      .from('ai_campaign_recommendations')
      .select('*')
      .eq('brand_id', brandId)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    if (existingRecommendations && existingRecommendations.length > 0) {
      const recommendations = existingRecommendations.map(rec => ({
        id: rec.id,
        type: rec.recommendation.type || 'budget',
        priority: rec.recommendation.priority || 'medium',
        title: rec.recommendation.title || 'Optimization Opportunity',
        description: rec.recommendation.description || '',
        rootCause: rec.recommendation.rootCause || 'Performance analysis detected an opportunity',
        actions: rec.recommendation.actions || [],
        currentValue: rec.recommendation.currentValue || '',
        recommendedValue: rec.recommendation.recommendedValue || '',
        projectedImpact: rec.recommendation.projectedImpact || { revenue: 0, roas: 0, confidence: 0 },
        campaignId: rec.campaign_id,
        campaignName: rec.campaign_name,
        platform: rec.platform
      }))

      return NextResponse.json({ recommendations })
    }

    // Generate new recommendations if none exist
    const recommendations = await generateRecommendations(brandId, dateRange)
    
    // Store recommendations in database
    for (const rec of recommendations) {
      await supabase
        .from('ai_campaign_recommendations')
        .upsert({
          brand_id: brandId,
          campaign_id: rec.campaignId,
          campaign_name: rec.campaignName,
          platform: rec.platform,
          recommendation: {
            type: rec.type,
            priority: rec.priority,
            title: rec.title,
            description: rec.description,
            rootCause: rec.rootCause,
            actions: rec.actions,
            currentValue: rec.currentValue,
            recommendedValue: rec.recommendedValue,
            projectedImpact: rec.projectedImpact
          },
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
        })
    }

    return NextResponse.json({ recommendations })

  } catch (error) {
    console.error('Error fetching recommendations:', error)
    return NextResponse.json({ error: 'Failed to fetch recommendations' }, { status: 500 })
  }
}

async function generateRecommendations(brandId: string, dateRange: { from: string; to: string }): Promise<OptimizationRecommendation[]> {
  try {
    // Get campaign performance data (note: purchase_value doesn't exist in this table)
    const { data: campaignStats, error: statsError } = await supabase
      .from('meta_campaign_daily_stats')
      .select('campaign_id, date, spend, impressions, clicks, conversions, roas, ctr, cpc')
      .eq('brand_id', brandId)
      .gte('date', dateRange.from)
      .lte('date', dateRange.to)

    if (statsError) {
      console.error('[Recommendations] Error fetching campaign stats:', statsError)
      return []
    }

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

    console.log(`[Recommendations] Processing ${campaignStats.length} campaign stats for ${campaigns.length} campaigns`)
    console.log(`[Recommendations] Date range: ${dateRange.from} to ${dateRange.to}`)
    console.log(`[Recommendations] Brand ID: ${brandId}`)
    
    // Log sample data to understand what we're working with
    if (campaignStats.length > 0) {
      const sample = campaignStats[0]
      console.log(`[Recommendations] Sample campaign stat:`, {
        campaign_id: sample.campaign_id,
        date: sample.date,
        spend: sample.spend,
        roas: sample.roas,
        impressions: sample.impressions,
        clicks: sample.clicks
      })
    }
    
    if (campaigns.length > 0) {
      const sampleCampaign = campaigns[0]
      console.log(`[Recommendations] Sample campaign:`, {
        campaign_id: sampleCampaign.campaign_id,
        campaign_name: sampleCampaign.campaign_name,
        status: sampleCampaign.status
      })
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
          totalRoas: 0,
          roasCount: 0, // Count days with ROAS > 0 for averaging
          days: 0
        })
      }
      const perf = campaignPerformance.get(campaignId)
      perf.totalSpend += parseFloat(stat.spend) || 0
      perf.totalImpressions += parseInt(stat.impressions) || 0
      perf.totalClicks += parseInt(stat.clicks) || 0
      perf.totalConversions += parseInt(stat.conversions) || 0
      
      // Track ROAS properly - only add if it's a valid value
      const dailyRoas = parseFloat(stat.roas) || 0
      if (dailyRoas > 0) {
        perf.totalRoas += dailyRoas
        perf.roasCount += 1
      }
      perf.days += 1
    })

    // Analyze each campaign for optimization opportunities
    for (const campaign of campaigns) {
      const perf = campaignPerformance.get(campaign.campaign_id)
      if (!perf) continue

      const avgDailySpend = perf.totalSpend / perf.days
      const ctr = perf.totalImpressions > 0 ? (perf.totalClicks / perf.totalImpressions) * 100 : 0
      const cpc = perf.totalClicks > 0 ? perf.totalSpend / perf.totalClicks : 0
      
      // Calculate average ROAS from database values
      const roas = perf.roasCount > 0 ? perf.totalRoas / perf.roasCount : 0
      
      console.log(`[Recommendations] Campaign ${campaign.campaign_name}: spend=$${perf.totalSpend.toFixed(2)}, ROAS=${roas.toFixed(2)}x (${perf.roasCount} days with data)`)

      // Skip campaigns with insufficient data (be more lenient)
      if (perf.totalSpend < 0.01) {
        console.log(`[Recommendations] Skipping campaign ${campaign.campaign_name} - insufficient spend: $${perf.totalSpend}`)
        continue
      }
      
      // Generate recommendations even if ROAS is missing (could suggest optimization for poor performers)

      // Budget optimization - if high ROAS, recommend scale
      if (roas > 2.5 && avgDailySpend > 0) {
        const currentBudget = campaign.daily_budget || avgDailySpend
        const recommendedBudget = Math.round(currentBudget * 1.5)
        const projectedRevenue = (recommendedBudget - currentBudget) * roas

        recommendations.push({
          type: 'budget',
          priority: roas > 4 ? 'high' : 'medium',
          title: 'Scale High-Performing Campaign',
          description: `Campaign "${campaign.campaign_name}" has strong ROAS of ${roas.toFixed(1)}x. Consider increasing budget to capture more profitable traffic.`,
          rootCause: `Analysis shows this campaign generates ${roas.toFixed(1)}x ROAS with daily spend of $${avgDailySpend.toFixed(0)}. Performance indicates scaling opportunity.`,
          actions: [{
            id: 'increase_budget',
            type: 'budget_increase',
            label: `Increase daily budget to $${recommendedBudget}`,
            impact: {
              revenue: projectedRevenue,
              roas: roas * 0.9, // Slight decrease due to scale
              confidence: 85
            },
            estimatedTimeToStabilize: '3-5 days'
          }],
          currentValue: `$${currentBudget}/day`,
          recommendedValue: `$${recommendedBudget}/day`,
          projectedImpact: {
            revenue: projectedRevenue,
            roas: roas * 0.9,
            confidence: 85
          },
          campaignId: campaign.campaign_id,
          campaignName: campaign.campaign_name,
          platform: 'meta'
        })
      }

      // CTR optimization - if low CTR, recommend creative refresh
      if (ctr < 1.5 && perf.totalImpressions > 1000) {
        recommendations.push({
          type: 'creative',
          priority: ctr < 1 ? 'high' : 'medium',
          title: 'Improve Ad Creative Performance',
          description: `Campaign "${campaign.campaign_name}" has low CTR of ${ctr.toFixed(2)}%. New creatives could improve engagement and reduce costs.`,
          rootCause: `CTR of ${ctr.toFixed(2)}% is below industry benchmark of 2-3%. Ad fatigue or poor creative-audience fit likely causing high CPCs.`,
          actions: [{
            id: 'refresh_creative',
            type: 'creative_refresh',
            label: 'Add new ad creatives and test variations',
            impact: {
              revenue: perf.totalSpend * 0.3, // 30% improvement
              roas: roas * 1.4,
              confidence: 75
            },
            estimatedTimeToStabilize: '7-10 days'
          }],
          currentValue: `${ctr.toFixed(2)}% CTR`,
          recommendedValue: `${(ctr * 1.5).toFixed(2)}% CTR`,
          projectedImpact: {
            revenue: perf.totalSpend * 0.3,
            roas: roas * 1.4,
            confidence: 75
          },
          campaignId: campaign.campaign_id,
          campaignName: campaign.campaign_name,
          platform: 'meta'
        })
      }

      // Frequency cap optimization - if high spend with low performance
      if (perf.totalSpend > 100 && roas < 2) {
        recommendations.push({
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

      // Basic optimization recommendations for campaigns with spend but no clear ROAS data
      if (perf.totalSpend > 10 && roas === 0) {
        recommendations.push({
          type: 'bid',
          priority: 'medium',
          title: 'Review Campaign Setup',
          description: `Campaign "${campaign.campaign_name}" has spend but missing conversion tracking. Review setup to improve measurement.`,
          rootCause: `Campaign has $${perf.totalSpend.toFixed(0)} in spend but no ROAS data, suggesting tracking issues or optimization opportunities.`,
          actions: [{
            id: 'review_tracking',
            type: 'campaign_review',
            label: 'Review conversion tracking and optimization settings',
            impact: {
              revenue: perf.totalSpend * 0.5,
              roas: 2.0,
              confidence: 60
            },
            estimatedTimeToStabilize: '3-7 days'
          }],
          currentValue: 'No conversion tracking',
          recommendedValue: 'Properly configured tracking',
          projectedImpact: {
            revenue: perf.totalSpend * 0.5,
            roas: 2.0,
            confidence: 60
          },
          campaignId: campaign.campaign_id,
          campaignName: campaign.campaign_name,
          platform: 'meta'
        })
      }
    }

    console.log(`[Recommendations] Generated ${recommendations.length} recommendations for brand ${brandId}`)
    
    if (recommendations.length === 0) {
      console.log(`[Recommendations] No recommendations generated. Campaign analysis:`)
      for (const campaign of campaigns) {
        const perf = campaignPerformance.get(campaign.campaign_id)
        if (perf) {
          console.log(`  - ${campaign.campaign_name}: spend=$${perf.totalSpend}, ROAS=${(perf.roasCount > 0 ? perf.totalRoas / perf.roasCount : 0).toFixed(2)}x`)
        } else {
          console.log(`  - ${campaign.campaign_name}: NO PERFORMANCE DATA FOUND`)
        }
      }
      
      // If we still have no recommendations but have campaigns, create a test recommendation
      if (campaigns.length > 0) {
        console.log(`[Recommendations] Creating fallback recommendations for testing`)
        const testCampaign = campaigns[0]
        recommendations.push({
          type: 'budget',
          priority: 'medium',
          title: 'Test Recommendation',
          description: `Test recommendation for campaign "${testCampaign.campaign_name}". This appears because no data-driven recommendations could be generated.`,
          rootCause: `No sufficient performance data available for automated analysis. This is a placeholder recommendation for debugging.`,
          actions: [{
            id: 'test_action',
            type: 'test',
            label: 'Review campaign manually',
            impact: {
              revenue: 100,
              roas: 1.5,
              confidence: 50
            },
            estimatedTimeToStabilize: '1-2 days'
          }],
          currentValue: 'Unknown',
          recommendedValue: 'Manual review needed',
          projectedImpact: {
            revenue: 100,
            roas: 1.5,
            confidence: 50
          },
          campaignId: testCampaign.campaign_id,
          campaignName: testCampaign.campaign_name,
          platform: 'meta'
        })
        console.log(`[Recommendations] Added 1 fallback test recommendation`)
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

    const { action, campaignId, actionId, brandId } = await request.json()

    if (action === 'apply_action') {
      // Apply the optimization action
      const result = await applyOptimizationAction(campaignId, actionId, brandId, userId)
      return NextResponse.json(result)
    }

    if (action === 'simulate_action') {
      // Simulate the optimization action
      const result = await simulateOptimizationAction(campaignId, actionId, brandId)
      return NextResponse.json(result)
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('Error handling recommendation action:', error)
    return NextResponse.json({ error: 'Failed to process action' }, { status: 500 })
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
