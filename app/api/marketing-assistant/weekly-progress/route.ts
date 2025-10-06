import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'
import { getMondayToMondayRange } from '@/lib/date-utils'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const brandId = searchParams.get('brandId')

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    const progress = await calculateWeeklyProgress(brandId)
    
    return NextResponse.json({ progress })

  } catch (error) {
    console.error('Error fetching weekly progress:', error)
    return NextResponse.json({ error: 'Failed to fetch weekly progress' }, { status: 500 })
  }
}

async function calculateWeeklyProgress(brandId: string) {
  // Get current week's date range (Monday to Monday)
  const { startDate: thisWeekStart, endDate: thisWeekEnd } = getMondayToMondayRange()
  
  // Get last week's date range
  const lastWeekEnd = new Date(thisWeekStart)
  lastWeekEnd.setDate(lastWeekEnd.getDate() - 1) // Day before this Monday
  const lastWeekStart = new Date(lastWeekEnd)
  lastWeekStart.setDate(lastWeekStart.getDate() - 6) // 7 days back
  
  const lastWeekStartStr = lastWeekStart.toISOString().split('T')[0]
  const lastWeekEndStr = lastWeekEnd.toISOString().split('T')[0]

  // Get ALL active AI recommendations (not just this week)
  const { data: recommendations } = await supabase
    .from('ai_campaign_recommendations')
    .select('*')
    .eq('brand_id', brandId)
    .order('created_at', { ascending: false })

  const totalRecommendations = recommendations?.length || 0

  // Count ALL implemented actions (not just this week)
  const { data: completedActions } = await supabase
    .from('ai_usage_tracking')
    .select('*')
    .eq('brand_id', brandId)
    .eq('feature_type', 'marketing_analysis')
    .eq('action_type', 'mark_as_done')

  const completedCount = completedActions?.length || 0
  const completionPercentage = totalRecommendations > 0 
    ? Math.round((completedCount / totalRecommendations) * 100) 
    : 0

  // Get this week's performance metrics
  const { data: thisWeekStats } = await supabase
    .from('meta_campaign_daily_stats')
    .select('spend, revenue, clicks, impressions')
    .eq('brand_id', brandId)
    .gte('date', thisWeekStart)
    .lte('date', thisWeekEnd)

  const thisWeekMetrics = {
    spend: thisWeekStats?.reduce((sum, s) => sum + (Number(s.spend) || 0), 0) || 0,
    revenue: thisWeekStats?.reduce((sum, s) => sum + (Number(s.revenue) || 0), 0) || 0,
    clicks: thisWeekStats?.reduce((sum, s) => sum + (Number(s.clicks) || 0), 0) || 0,
    impressions: thisWeekStats?.reduce((sum, s) => sum + (Number(s.impressions) || 0), 0) || 0,
  }

  thisWeekMetrics.roas = thisWeekMetrics.spend > 0 
    ? thisWeekMetrics.revenue / thisWeekMetrics.spend 
    : 0
  thisWeekMetrics.ctr = thisWeekMetrics.impressions > 0
    ? (thisWeekMetrics.clicks / thisWeekMetrics.impressions) * 100
    : 0

  // Get last week's performance metrics
  const { data: lastWeekStats } = await supabase
    .from('meta_campaign_daily_stats')
    .select('spend, revenue, clicks, impressions')
    .eq('brand_id', brandId)
    .gte('date', lastWeekStartStr)
    .lte('date', lastWeekEndStr)

  const lastWeekMetrics = {
    spend: lastWeekStats?.reduce((sum, s) => sum + (Number(s.spend) || 0), 0) || 0,
    revenue: lastWeekStats?.reduce((sum, s) => sum + (Number(s.revenue) || 0), 0) || 0,
    clicks: lastWeekStats?.reduce((sum, s) => sum + (Number(s.clicks) || 0), 0) || 0,
    impressions: lastWeekStats?.reduce((sum, s) => sum + (Number(s.impressions) || 0), 0) || 0,
  }

  lastWeekMetrics.roas = lastWeekMetrics.spend > 0 
    ? lastWeekMetrics.revenue / lastWeekMetrics.spend 
    : 0
  lastWeekMetrics.ctr = lastWeekMetrics.impressions > 0
    ? (lastWeekMetrics.clicks / lastWeekMetrics.impressions) * 100
    : 0

  // Calculate week-over-week changes
  const changes = {
    roas: lastWeekMetrics.roas > 0 
      ? ((thisWeekMetrics.roas - lastWeekMetrics.roas) / lastWeekMetrics.roas) * 100 
      : 0,
    ctr: lastWeekMetrics.ctr > 0
      ? ((thisWeekMetrics.ctr - lastWeekMetrics.ctr) / lastWeekMetrics.ctr) * 100
      : 0,
    revenue: lastWeekMetrics.revenue > 0
      ? ((thisWeekMetrics.revenue - lastWeekMetrics.revenue) / lastWeekMetrics.revenue) * 100
      : 0,
  }

  // Determine key insights
  const insights = []
  
  if (completionPercentage >= 75) {
    insights.push({
      type: 'success',
      message: `Great progress! You've completed ${completionPercentage}% of recommendations.`
    })
  } else if (completionPercentage >= 50) {
    insights.push({
      type: 'info',
      message: `Halfway there! ${100 - completionPercentage}% of optimizations remaining.`
    })
  } else if (totalRecommendations > 0) {
    insights.push({
      type: 'warning',
      message: `${totalRecommendations - completedCount} optimizations waiting to be implemented.`
    })
  }

  if (changes.roas > 10) {
    insights.push({
      type: 'success',
      message: `ROAS improved ${changes.roas.toFixed(1)}% vs last week! 🎉`
    })
  } else if (changes.roas < -10) {
    insights.push({
      type: 'warning',
      message: `ROAS dropped ${Math.abs(changes.roas).toFixed(1)}% - review recent changes.`
    })
  }

  if (changes.ctr > 15) {
    insights.push({
      type: 'success',
      message: `CTR up ${changes.ctr.toFixed(1)}% - your ads are resonating better!`
    })
  }

  return {
    totalRecommendations,
    completedCount,
    completionPercentage,
    thisWeek: thisWeekMetrics,
    lastWeek: lastWeekMetrics,
    changes,
    insights,
    weekRange: {
      start: thisWeekStart,
      end: thisWeekEnd
    }
  }
}

