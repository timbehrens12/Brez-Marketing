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

  // Get ALL AI recommendations (both current and past) to show what goals were set
  const { data: allRecommendations, error: recsError } = await supabase
    .from('ai_campaign_recommendations')
    .select('id, created_at, recommendation, campaign_id, campaign_name')
    .eq('brand_id', brandId)
    .order('created_at', { ascending: false })
  
  console.log(`[Optimization Timeline] Fetched ${allRecommendations?.length || 0} AI recommendations (all time)`)
  if (recsError) {
    console.error('[Optimization Timeline] Error fetching recommendations:', recsError)
  }
  
  // Create a map of recommendation IDs to full recommendation data
  const recommendationMap = new Map()
  allRecommendations?.forEach(rec => {
    recommendationMap.set(rec.id, rec)
  })

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

  // Process completed optimizations and fetch full recommendation details
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
    
    // Extract metadata and get full recommendation details
    try {
      const metadata = typeof action.metadata === 'string' 
        ? JSON.parse(action.metadata) 
        : action.metadata
      
      // Try to get full recommendation from the map
      const fullRecommendation = recommendationMap.get(metadata?.recommendation_id)
      
      if (fullRecommendation) {
        const recData = typeof fullRecommendation.recommendation === 'string'
          ? JSON.parse(fullRecommendation.recommendation)
          : fullRecommendation.recommendation
        
        weeklyData[weekKey].actions.push({
          title: recData?.title || metadata?.recommendation_title || 'Optimization Applied',
          description: recData?.description || 'No description available',
          category: recData?.type || 'general',
          created_at: action.created_at
        })
      } else {
        // Fallback to metadata only
        weeklyData[weekKey].actions.push({
          title: metadata?.recommendation_title || 'Optimization Applied',
          description: 'No description available',
          category: 'general',
          created_at: action.created_at
        })
      }
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

  // Process ALL recommendations to show as goals for the current week
  // Goals = all active recommendations that haven't been completed yet
  allRecommendations?.forEach((rec) => {
    // Add all current recommendations as goals for the current week
    const currentWeekStart = getWeekStart(today)
    const currentWeekKey = formatWeekKey(currentWeekStart)
    
    // Create week entry if it doesn't exist
    if (!weeklyData[currentWeekKey]) {
      weeklyData[currentWeekKey] = { 
        week: currentWeekKey, 
        weekStart: currentWeekStart, 
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
      
      weeklyData[currentWeekKey].goals.push({
        title: recommendation?.title || 'Optimization Goal',
        description: recommendation?.description || 'Improve campaign performance',
        type: recommendation?.type || 'general',
        created_at: rec.created_at
      })
    } catch (e) {
      // If parsing fails, just add a generic entry
      weeklyData[currentWeekKey].goals.push({
        title: 'Optimization Goal',
        description: 'Improve campaign performance',
        type: 'general',
        created_at: rec.created_at
      })
    }
  })

  // Find the week when first optimization was applied
  const weeksWithOptimizations = Object.values(weeklyData)
    .filter(w => w.optimizationsApplied > 0)
    .sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime())
  
  let timelineArray: any[] = []
  
  if (weeksWithOptimizations.length > 0) {
    // Start from the first optimization week
    const firstOptWeek = weeksWithOptimizations[0].weekStart
    const currentWeekStart = getWeekStart(today)
    
    // Generate timeline from first optimization week to 8 weeks in the future
    for (let i = 0; i < 8; i++) {
      const weekStart = new Date(firstOptWeek)
      weekStart.setDate(weekStart.getDate() + (i * 7))
      const weekKey = formatWeekKey(weekStart)
      
      // Use existing data if available, otherwise create placeholder
      const existingWeek = weeklyData[weekKey]
      if (existingWeek) {
        timelineArray.push({
          week: weekKey,
          spend: Math.round(existingWeek.spend * 100) / 100,
          revenue: Math.round(existingWeek.revenue * 100) / 100,
          roas: Math.round(existingWeek.roas * 100) / 100,
          ctr: Math.round(existingWeek.ctr * 100) / 100,
          optimizationsApplied: existingWeek.optimizationsApplied,
          actions: existingWeek.actions,
          goals: existingWeek.goals,
          impressions: existingWeek.impressions,
          clicks: existingWeek.clicks
        })
      } else {
        // Future week placeholder
        timelineArray.push({
          week: weekKey,
          spend: 0,
          revenue: 0,
          roas: 0,
          ctr: 0,
          optimizationsApplied: 0,
          actions: [],
          goals: [],
          impressions: 0,
          clicks: 0
        })
      }
    }
  } else {
    // No optimizations yet - show current week as Week 1
    const currentWeekStart = getWeekStart(today)
    
    for (let i = 0; i < 8; i++) {
      const weekStart = new Date(currentWeekStart)
      weekStart.setDate(weekStart.getDate() + (i * 7))
      const weekKey = formatWeekKey(weekStart)
      
      const existingWeek = weeklyData[weekKey]
      timelineArray.push({
        week: weekKey,
        spend: existingWeek?.spend ? Math.round(existingWeek.spend * 100) / 100 : 0,
        revenue: existingWeek?.revenue ? Math.round(existingWeek.revenue * 100) / 100 : 0,
        roas: existingWeek?.roas ? Math.round(existingWeek.roas * 100) / 100 : 0,
        ctr: existingWeek?.ctr ? Math.round(existingWeek.ctr * 100) / 100 : 0,
        optimizationsApplied: existingWeek?.optimizationsApplied || 0,
        actions: existingWeek?.actions || [],
        goals: existingWeek?.goals || [],
        impressions: existingWeek?.impressions || 0,
        clicks: existingWeek?.clicks || 0
      })
    }
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

