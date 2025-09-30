import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Capture baseline performance when recommendation is created
export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { recommendationId, brandId, campaignId, recommendationType } = await request.json()

    // Get campaign performance for the past 7 days as baseline
    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000)

    const { data: statsData } = await supabase
      .from('meta_campaign_daily_stats')
      .select('*')
      .eq('brand_id', brandId)
      .eq('campaign_id', campaignId)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])

    const baselineMetrics = calculateMetrics(statsData || [])

    // Store baseline performance
    const { data, error } = await supabase
      .from('recommendation_performance')
      .insert({
        brand_id: brandId,
        campaign_id: campaignId,
        recommendation_id: recommendationId,
        recommendation_type: recommendationType,
        action_taken: false,
        before_metrics: baselineMetrics,
        before_period_start: startDate.toISOString().split('T')[0],
        before_period_end: endDate.toISOString().split('T')[0],
        recommendation_created_at: new Date().toISOString(),
        outcome: 'pending'
      })
      .select()
      .single()

    if (error) {
      console.error('[Performance Tracking] Error storing baseline:', error)
      return NextResponse.json({ error: 'Failed to store baseline' }, { status: 500 })
    }

    return NextResponse.json({ success: true, performanceId: data.id })
  } catch (error) {
    console.error('[Performance Tracking] Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// Measure impact when recommendation is completed
export async function PUT(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { recommendationId, brandId, campaignId } = await request.json()

    // Find the performance record
    const { data: perfRecord } = await supabase
      .from('recommendation_performance')
      .select('*')
      .eq('recommendation_id', recommendationId)
      .single()

    if (!perfRecord) {
      return NextResponse.json({ error: 'Performance record not found' }, { status: 404 })
    }

    // Get campaign performance for 7 days after action
    const actionDate = new Date()
    const startDate = new Date(actionDate.getTime() + 1 * 24 * 60 * 60 * 1000) // Start tomorrow
    const endDate = new Date(actionDate.getTime() + 8 * 24 * 60 * 60 * 1000) // End in 8 days

    const { data: statsData } = await supabase
      .from('meta_campaign_daily_stats')
      .select('*')
      .eq('brand_id', brandId)
      .eq('campaign_id', campaignId)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])

    const afterMetrics = calculateMetrics(statsData || [])
    const beforeMetrics = perfRecord.before_metrics as any

    // Calculate impact
    const impact = {
      spend_change: calculateChange(beforeMetrics.spend, afterMetrics.spend),
      revenue_change: calculateChange(beforeMetrics.revenue, afterMetrics.revenue),
      roas_change: calculateChange(beforeMetrics.roas, afterMetrics.roas),
      ctr_change: calculateChange(beforeMetrics.ctr, afterMetrics.ctr),
      cpc_change: calculateChange(beforeMetrics.cpc, afterMetrics.cpc),
      conversions_change: calculateChange(beforeMetrics.conversions, afterMetrics.conversions)
    }

    // Determine outcome based on recommendation type
    let outcome = 'neutral'
    if (perfRecord.recommendation_type === 'budget') {
      // For budget recommendations, success = ROAS maintained or improved while scaling
      if (impact.roas_change >= -10 && impact.revenue_change > 10) {
        outcome = 'positive'
      } else if (impact.roas_change < -20) {
        outcome = 'negative'
      }
    } else if (perfRecord.recommendation_type === 'creative') {
      // For creative recommendations, success = CTR improved
      if (impact.ctr_change > 10) {
        outcome = 'positive'
      } else if (impact.ctr_change < -5) {
        outcome = 'negative'
      }
    } else if (perfRecord.recommendation_type === 'audience') {
      // For audience/tracking recommendations, success = revenue tracking improved
      if (impact.revenue_change > 20 || (afterMetrics.revenue > 0 && beforeMetrics.revenue === 0)) {
        outcome = 'positive'
      }
    }

    // Update performance record
    const { error } = await supabase
      .from('recommendation_performance')
      .update({
        action_taken: true,
        action_completed_at: actionDate.toISOString(),
        after_metrics: afterMetrics,
        after_period_start: startDate.toISOString().split('T')[0],
        after_period_end: endDate.toISOString().split('T')[0],
        impact_analysis: impact,
        outcome,
        impact_measured_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', perfRecord.id)

    if (error) {
      console.error('[Performance Tracking] Error updating impact:', error)
      return NextResponse.json({ error: 'Failed to update impact' }, { status: 500 })
    }

    console.log(`[Performance Tracking] Measured impact for recommendation ${recommendationId}: ${outcome}`)
    console.log(`[Performance Tracking] Impact:`, impact)

    return NextResponse.json({ success: true, outcome, impact })
  } catch (error) {
    console.error('[Performance Tracking] Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// Get historical performance for a brand to inform future recommendations
export async function GET(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const brandId = searchParams.get('brandId')
    const recommendationType = searchParams.get('type')

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID required' }, { status: 400 })
    }

    let query = supabase
      .from('recommendation_performance')
      .select('*')
      .eq('brand_id', brandId)
      .eq('action_taken', true)
      .not('outcome', 'eq', 'pending')
      .order('action_completed_at', { ascending: false })
      .limit(10)

    if (recommendationType) {
      query = query.eq('recommendation_type', recommendationType)
    }

    const { data, error } = await query

    if (error) {
      console.error('[Performance Tracking] Error fetching history:', error)
      return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 })
    }

    // Calculate success rates by type
    const successRates: Record<string, { total: number; positive: number; negative: number; neutral: number }> = {}
    
    data?.forEach(record => {
      const type = record.recommendation_type
      if (!successRates[type]) {
        successRates[type] = { total: 0, positive: 0, negative: 0, neutral: 0 }
      }
      successRates[type].total++
      successRates[type][record.outcome as 'positive' | 'negative' | 'neutral']++
    })

    return NextResponse.json({ history: data, successRates })
  } catch (error) {
    console.error('[Performance Tracking] Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

function calculateMetrics(statsData: any[]) {
  const totals = statsData.reduce((acc, day) => ({
    spend: acc.spend + (day.spend || 0),
    revenue: acc.revenue + (day.revenue || 0),
    impressions: acc.impressions + (day.impressions || 0),
    clicks: acc.clicks + (day.clicks || 0),
    conversions: acc.conversions + (day.conversions || 0)
  }), { spend: 0, revenue: 0, impressions: 0, clicks: 0, conversions: 0 })

  return {
    spend: totals.spend,
    revenue: totals.revenue,
    roas: totals.spend > 0 ? totals.revenue / totals.spend : 0,
    ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
    cpc: totals.clicks > 0 ? totals.spend / totals.clicks : 0,
    conversions: totals.conversions,
    cpa: totals.conversions > 0 ? totals.spend / totals.conversions : 0
  }
}

function calculateChange(before: number, after: number): number {
  if (before === 0) return after > 0 ? 100 : 0
  return Math.round(((after - before) / before) * 100)
}
