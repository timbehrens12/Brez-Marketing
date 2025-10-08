import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'
import { getSundayToSundayRange } from '@/lib/date-utils'

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
  // Week 1 = Current week ALWAYS
  // Fetch the current week's data (Sunday to Sunday)
  const today = new Date()
  const { from: currentWeekStart, to: currentWeekEnd } = getSundayToSundayRange()
  
  console.log(`[Optimization Timeline] Current week: ${currentWeekStart} to ${currentWeekEnd}`)

  // Fetch campaign stats for CURRENT WEEK (this is Week 1 data)
  const { data: campaignStats, error: campaignStatsError } = await supabase
    .from('meta_campaign_daily_stats')
    .select('date, spend, impressions, clicks, roas, purchase_count')
    .eq('brand_id', brandId)
    .gte('date', currentWeekStart)
    .lte('date', currentWeekEnd)
    .order('date', { ascending: true })
  
  console.log(`[Optimization Timeline] Fetched ${campaignStats?.length || 0} campaign stats for current week (${currentWeekStart} to ${currentWeekEnd})`)
  if (campaignStatsError) {
    console.error('[Optimization Timeline] Error fetching campaign stats:', campaignStatsError)
  }

  // Get completed optimizations (all time - we'll filter by week later)
  const { data: completedActions, error: actionsError } = await supabase
    .from('ai_usage_logs')
    .select('created_at, metadata')
    .eq('brand_id', brandId)
    .eq('endpoint', 'mark_as_done')
    .order('created_at', { ascending: true })
  
  console.log(`[Optimization Timeline] Fetched ${completedActions?.length || 0} completed optimizations`)
  if (actionsError) {
    console.error('[Optimization Timeline] Error fetching completed actions:', actionsError)
  }

  // Get ALL current recommendations (for goals)
  const { data: recommendations, error: recsError } = await supabase
    .from('ai_campaign_recommendations')
    .select('created_at, recommendation, campaign_id')
    .eq('brand_id', brandId)
    .order('created_at', { ascending: true })
  
  console.log(`[Optimization Timeline] Fetched ${recommendations?.length || 0} AI recommendations`)
  if (recsError) {
    console.error('[Optimization Timeline] Error fetching recommendations:', recsError)
  }

  // Helper to get week key (Sunday of that week)
  const getWeekStart = (date: Date) => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day // Sunday is 0, so this gets us to Sunday
    const sunday = new Date(d.setDate(diff))
    sunday.setHours(0, 0, 0, 0)
    return sunday
  }

  const formatWeekKey = (date: Date) => {
    const month = date.toLocaleDateString('en-US', { month: 'short' })
    const day = date.getDate()
    return `${month} ${day}`
  }

  // Current week's Sunday
  const currentWeekSunday = getWeekStart(today)
  const currentWeekKey = formatWeekKey(currentWeekSunday)
  
  // Aggregate current week's data
  let currentWeekData = {
    spend: 0,
    revenue: 0,
    impressions: 0,
    clicks: 0,
    roas: 0,
    ctr: 0,
    optimizationsApplied: 0,
    actions: [] as any[],
    goals: [] as any[]
  }
  
  // Process ALL campaign stats from current week (they're already filtered to current week by the query)
  campaignStats?.forEach((stat) => {
    const spend = Number(stat.spend) || 0
    const roas = Number(stat.roas) || 0
    const revenue = spend * roas
    
    currentWeekData.spend += spend
    currentWeekData.revenue += revenue
    currentWeekData.impressions += Number(stat.impressions) || 0
    currentWeekData.clicks += Number(stat.clicks) || 0
  })
  
  // Calculate ROAS and CTR
  currentWeekData.roas = currentWeekData.spend > 0 ? currentWeekData.revenue / currentWeekData.spend : 0
  currentWeekData.ctr = currentWeekData.impressions > 0 ? (currentWeekData.clicks / currentWeekData.impressions) * 100 : 0
  
  console.log(`[Optimization Timeline] Current week (${currentWeekKey}): $${currentWeekData.spend.toFixed(2)} spend, ${currentWeekData.impressions} impressions`)

  // Process completed optimizations - only count those in current week
  completedActions?.forEach((action) => {
    const actionWeekStart = getWeekStart(new Date(action.created_at))
    const actionWeekKey = formatWeekKey(actionWeekStart)
    
    // Only add to current week data
    if (actionWeekKey === currentWeekKey) {
      currentWeekData.optimizationsApplied++
      
      // Extract optimization details from metadata
      try {
        const metadata = typeof action.metadata === 'string' 
          ? JSON.parse(action.metadata) 
          : action.metadata
        
        currentWeekData.actions.push({
          title: metadata?.recommendation_title || metadata?.title || 'Optimization Applied',
          description: metadata?.description || 'No description available',
          category: metadata?.category || 'general',
          created_at: action.created_at
        })
      } catch (e) {
        // If parsing fails, just add a generic entry
        currentWeekData.actions.push({
          title: 'Optimization Applied',
          description: 'Details unavailable',
          category: 'general',
          created_at: action.created_at
        })
      }
    }
  })

  // Process recommendations to show goals for current week
  recommendations?.forEach((rec) => {
    try {
      const recommendation = typeof rec.recommendation === 'string' 
        ? JSON.parse(rec.recommendation) 
        : rec.recommendation
      
      currentWeekData.goals.push({
        title: recommendation?.title || 'Optimization Goal',
        description: recommendation?.description || 'Improve campaign performance',
        type: recommendation?.type || 'general',
        created_at: rec.created_at
      })
    } catch (e) {
      // If parsing fails, just add a generic entry
      currentWeekData.goals.push({
        title: 'Optimization Goal',
        description: 'Improve campaign performance',
        type: 'general',
        created_at: rec.created_at
      })
    }
  })

  // Build timeline: Week 1 = current week data, Weeks 2-8 = future placeholders
  const timelineArray: any[] = []
  
  // Week 1 = Current week (always)
  timelineArray.push({
    week: currentWeekKey,
    spend: Math.round(currentWeekData.spend * 100) / 100,
    revenue: Math.round(currentWeekData.revenue * 100) / 100,
    roas: Math.round(currentWeekData.roas * 100) / 100,
    ctr: Math.round(currentWeekData.ctr * 100) / 100,
    impressions: currentWeekData.impressions,
    clicks: currentWeekData.clicks,
    optimizationsApplied: currentWeekData.optimizationsApplied,
    actions: currentWeekData.actions,
    goals: currentWeekData.goals
  })
  
  // Weeks 2-8: Future weeks (placeholders)
  for (let i = 1; i < 8; i++) {
    const futureWeekStart = new Date(currentWeekSunday)
    futureWeekStart.setDate(currentWeekSunday.getDate() + (i * 7))
    const futureWeekKey = formatWeekKey(futureWeekStart)
    
    timelineArray.push({
      week: futureWeekKey,
      spend: 0,
      revenue: 0,
      roas: 0,
      ctr: 0,
      impressions: 0,
      clicks: 0,
      optimizationsApplied: 0,
      actions: [],
      goals: []
    })
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

