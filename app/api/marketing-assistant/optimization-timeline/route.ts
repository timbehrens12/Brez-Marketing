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

  const { data: adStats } = await supabase
    .from('meta_ad_daily_stats')
    .select('date, spend, impressions, clicks, revenue')
    .eq('brand_id', brandId)
    .gte('date', eightWeeksAgo.toISOString().split('T')[0])
    .order('date', { ascending: true })

  // Get completed optimizations to show which weeks had optimizations applied
  const { data: completedActions } = await supabase
    .from('ai_usage_logs')
    .select('created_at')
    .eq('brand_id', brandId)
    .eq('endpoint', 'mark_as_done')
    .gte('created_at', eightWeeksAgo.toISOString())
    .order('created_at', { ascending: true })

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

  // Process ad performance data by week
  adStats?.forEach((stat) => {
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
        optimizationsApplied: 0
      }
    }
    
    weeklyData[weekKey].spend += Number(stat.spend) || 0
    weeklyData[weekKey].revenue += Number(stat.revenue) || 0
    weeklyData[weekKey].impressions += Number(stat.impressions) || 0
    weeklyData[weekKey].clicks += Number(stat.clicks) || 0
  })

  // Calculate ROAS and CTR for each week
  Object.values(weeklyData).forEach((week) => {
    week.roas = week.spend > 0 ? week.revenue / week.spend : 0
    week.ctr = week.impressions > 0 ? (week.clicks / week.impressions) * 100 : 0
  })

  // Process completed optimizations
  completedActions?.forEach((action) => {
    const weekStart = getWeekStart(new Date(action.created_at))
    const weekKey = formatWeekKey(weekStart)
    
    if (weeklyData[weekKey]) {
      weeklyData[weekKey].optimizationsApplied++
    }
  })

  // Convert to array and sort by date
  const timelineArray = Object.values(weeklyData)
    .sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime())
    .map(({ week, spend, revenue, roas, ctr, optimizationsApplied }) => ({ 
      week, 
      spend: Math.round(spend * 100) / 100, 
      revenue: Math.round(revenue * 100) / 100, 
      roas: Math.round(roas * 100) / 100, 
      ctr: Math.round(ctr * 100) / 100,
      optimizationsApplied
    }))
    .slice(-8) // Last 8 weeks

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

