import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'

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

    const timeline = await getOptimizationTimeline(brandId)
    
    return NextResponse.json({ timeline })

  } catch (error) {
    console.error('[Optimization Timeline] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch timeline' }, { status: 500 })
  }
}

async function getOptimizationTimeline(brandId: string) {
  // Get last 8 weeks of Meta ad performance data
  const today = new Date()
  const eightWeeksAgo = new Date(today)
  eightWeeksAgo.setDate(today.getDate() - 56) // 8 weeks = 56 days

  // Note: meta_campaign_daily_stats doesn't have revenue column
  // We'll calculate revenue from ROAS * spend
  const { data: campaignStats, error: campaignStatsError } = await supabase
    .from('meta_campaign_daily_stats')
    .select('date, spend, impressions, clicks, roas, purchase_count')
    .eq('brand_id', brandId)
    .gte('date', eightWeeksAgo.toISOString().split('T')[0])
    .order('date', { ascending: true })
  
  console.log(`[Optimization Timeline] Fetched ${campaignStats?.length || 0} campaign stats records from ${eightWeeksAgo.toISOString().split('T')[0]}`)
  if (campaignStatsError) {
    console.error('[Optimization Timeline] Error fetching campaign stats:', campaignStatsError)
  }

  // Get completed optimizations to show which weeks had optimizations applied
  const { data: completedActions, error: actionsError } = await supabase
    .from('ai_usage_logs')
    .select('created_at, metadata')
    .eq('brand_id', brandId)
    .eq('endpoint', 'mark_as_done')
    .gte('created_at', eightWeeksAgo.toISOString())
    .order('created_at', { ascending: true })
  
  console.log(`[Optimization Timeline] Fetched ${completedActions?.length || 0} completed optimizations`)
  if (actionsError) {
    console.error('[Optimization Timeline] Error fetching completed actions:', actionsError)
  }

  // Get AI recommendations to show what goals were set for each week
  const { data: recommendations, error: recsError } = await supabase
    .from('ai_campaign_recommendations')
    .select('created_at, recommendation, campaign_id')
    .eq('brand_id', brandId)
    .gte('created_at', eightWeeksAgo.toISOString())
    .order('created_at', { ascending: true })
  
  console.log(`[Optimization Timeline] Fetched ${recommendations?.length || 0} AI recommendations`)
  if (recsError) {
    console.error('[Optimization Timeline] Error fetching recommendations:', recsError)
  }

  // Group by week
  const weeklyData: { [key: string]: { 
    week: string
    weekStart: Date
    spend: number
    revenue: number
    impressions: number
    clicks: number
    roas: number
    ctr: number
    optimizationsApplied: number
    actions: any[]
    goals: any[]
  } } = {}

  // Helper to get week key (Monday of that week)
  const getWeekStart = (date: Date) => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Adjust to Monday
    const monday = new Date(d.setDate(diff))
    monday.setHours(0, 0, 0, 0)
    return monday
  }

  const formatWeekKey = (date: Date) => {
    const month = date.toLocaleDateString('en-US', { month: 'short' })
    const day = date.getDate()
    return `${month} ${day}`
  }

  // Process campaign performance data by week
  campaignStats?.forEach((stat) => {
    const weekStart = getWeekStart(new Date(stat.date))
    const weekKey = formatWeekKey(weekStart)
    
    if (!weeklyData[weekKey]) {
      weeklyData[weekKey] = { 
        week: weekKey, 
        weekStart, 
        spend: 0, 
        revenue: 0, 
        impressions: 0, 
        clicks: 0, 
        roas: 0, 
        ctr: 0,
        optimizationsApplied: 0,
        actions: [],
        goals: []
      }
    }
    
    const spend = Number(stat.spend) || 0
    const roas = Number(stat.roas) || 0
    const revenue = spend * roas // Calculate revenue from ROAS * spend
    
    weeklyData[weekKey].spend += spend
    weeklyData[weekKey].revenue += revenue
    weeklyData[weekKey].impressions += Number(stat.impressions) || 0
    weeklyData[weekKey].clicks += Number(stat.clicks) || 0
  })

  // Calculate ROAS and CTR for each week
  Object.values(weeklyData).forEach((week) => {
    week.roas = week.spend > 0 ? week.revenue / week.spend : 0
    week.ctr = week.impressions > 0 ? (week.clicks / week.impressions) * 100 : 0
  })
  
  console.log(`[Optimization Timeline] Processed ${Object.keys(weeklyData).length} weeks of data:`, 
    Object.entries(weeklyData).map(([key, val]) => `${key}: $${val.spend.toFixed(2)} spend, ${val.optimizationsApplied} opts`)
  )

  // Process completed optimizations
  completedActions?.forEach((action) => {
    const weekStart = getWeekStart(new Date(action.created_at))
    const weekKey = formatWeekKey(weekStart)
    
    // Create week entry if it doesn't exist (for weeks with optimizations but no ad data yet)
    if (!weeklyData[weekKey]) {
      weeklyData[weekKey] = { 
        week: weekKey, 
        weekStart, 
        spend: 0, 
        revenue: 0, 
        impressions: 0, 
        clicks: 0, 
        roas: 0, 
        ctr: 0,
        optimizationsApplied: 0,
        actions: [],
        goals: []
      }
    }
    
    weeklyData[weekKey].optimizationsApplied++
    
    // Extract optimization details from metadata
    try {
      const metadata = typeof action.metadata === 'string' 
        ? JSON.parse(action.metadata) 
        : action.metadata
      
      weeklyData[weekKey].actions.push({
        title: metadata?.recommendation_title || metadata?.title || 'Optimization Applied',
        description: metadata?.description || 'No description available',
        category: metadata?.category || 'general',
        created_at: action.created_at
      })
    } catch (e) {
      // If parsing fails, just add a generic entry
      weeklyData[weekKey].actions.push({
        title: 'Optimization Applied',
        description: 'Details unavailable',
        category: 'general',
        created_at: action.created_at
      })
    }
  })

  // Process recommendations to show goals for each week
  recommendations?.forEach((rec) => {
    const weekStart = getWeekStart(new Date(rec.created_at))
    const weekKey = formatWeekKey(weekStart)
    
    // Create week entry if it doesn't exist
    if (!weeklyData[weekKey]) {
      weeklyData[weekKey] = { 
        week: weekKey, 
        weekStart, 
        spend: 0, 
        revenue: 0, 
        impressions: 0, 
        clicks: 0, 
        roas: 0, 
        ctr: 0,
        optimizationsApplied: 0,
        actions: [],
        goals: []
      }
    }
    
    // Extract goal/recommendation details from JSONB recommendation column
    try {
      const recommendation = typeof rec.recommendation === 'string' 
        ? JSON.parse(rec.recommendation) 
        : rec.recommendation
      
      weeklyData[weekKey].goals.push({
        title: recommendation?.title || 'Optimization Goal',
        description: recommendation?.description || 'Improve campaign performance',
        type: recommendation?.type || 'general',
        created_at: rec.created_at
      })
    } catch (e) {
      // If parsing fails, just add a generic entry
      weeklyData[weekKey].goals.push({
        title: 'Optimization Goal',
        description: 'Improve campaign performance',
        type: 'general',
        created_at: rec.created_at
      })
    }
  })

  // Convert to array and sort by date
  let timelineArray = Object.values(weeklyData)
    .sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime())
    .map(({ week, spend, revenue, roas, ctr, optimizationsApplied, actions, goals, impressions, clicks }) => ({ 
      week, 
      spend: Math.round(spend * 100) / 100, 
      revenue: Math.round(revenue * 100) / 100, 
      roas: Math.round(roas * 100) / 100, 
      ctr: Math.round(ctr * 100) / 100,
      optimizationsApplied,
      actions,
      goals,
      impressions,
      clicks
    }))
    .slice(-8) // Last 8 weeks
  
  // If no data exists, create a placeholder for the current week
  if (timelineArray.length === 0) {
    const currentWeekStart = getWeekStart(today)
    const currentWeekKey = formatWeekKey(currentWeekStart)
    timelineArray = [{
      week: currentWeekKey,
      spend: 0,
      revenue: 0,
      roas: 0,
      ctr: 0,
      optimizationsApplied: 0,
      actions: [],
      goals: [],
      impressions: 0,
      clicks: 0
    }]
  }

  // Calculate week-over-week improvements
  const improvements = timelineArray.map((week, index) => {
    if (index === 0) return { ...week, roasChange: 0, ctrChange: 0 }
    
    const previous = timelineArray[index - 1]
    const roasChange = previous.roas > 0 ? ((week.roas - previous.roas) / previous.roas) * 100 : 0
    const ctrChange = previous.ctr > 0 ? ((week.ctr - previous.ctr) / previous.ctr) * 100 : 0
    
    return {
      ...week,
      roasChange: Math.round(roasChange),
      ctrChange: Math.round(ctrChange)
    }
  })

  // Calculate overall stats
  const totalOptimizations = timelineArray.reduce((sum, week) => sum + week.optimizationsApplied, 0)
  const avgRoas = timelineArray.length > 0 
    ? timelineArray.reduce((sum, week) => sum + week.roas, 0) / timelineArray.length 
    : 0
  const avgCtr = timelineArray.length > 0
    ? timelineArray.reduce((sum, week) => sum + week.ctr, 0) / timelineArray.length
    : 0

  return {
    weeks: improvements,
    stats: {
      totalOptimizations,
      avgRoas: Math.round(avgRoas * 100) / 100,
      avgCtr: Math.round(avgCtr * 100) / 100,
      weeksTracked: timelineArray.length
    }
  }
}

