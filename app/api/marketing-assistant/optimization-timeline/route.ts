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
  // Get all AI analysis runs (when recommendations were generated)
  const { data: recommendations } = await supabase
    .from('ai_campaign_recommendations')
    .select('created_at, recommendation_type')
    .eq('brand_id', brandId)
    .order('created_at', { ascending: true })

  // Get all completed optimizations
  const { data: completedActions } = await supabase
    .from('ai_usage_logs')
    .select('created_at, metadata')
    .eq('brand_id', brandId)
    .eq('endpoint', 'mark_as_done')
    .order('created_at', { ascending: true })

  // Group by week
  const weeklyData: { [key: string]: { week: string; analyzed: number; applied: number; weekStart: Date } } = {}

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

  // Process recommendations (when analysis was run)
  recommendations?.forEach((rec) => {
    const weekStart = getWeekStart(new Date(rec.created_at))
    const weekKey = formatWeekKey(weekStart)
    
    if (!weeklyData[weekKey]) {
      weeklyData[weekKey] = { week: weekKey, analyzed: 0, applied: 0, weekStart }
    }
    weeklyData[weekKey].analyzed++
  })

  // Process completed actions
  completedActions?.forEach((action) => {
    const weekStart = getWeekStart(new Date(action.created_at))
    const weekKey = formatWeekKey(weekStart)
    
    if (!weeklyData[weekKey]) {
      weeklyData[weekKey] = { week: weekKey, analyzed: 0, applied: 0, weekStart }
    }
    weeklyData[weekKey].applied++
  })

  // Convert to array and sort by date
  const timelineArray = Object.values(weeklyData)
    .sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime())
    .map(({ week, analyzed, applied }) => ({ week, analyzed, applied }))
    .slice(-8) // Last 8 weeks

  // Calculate totals
  const totalAnalyzed = timelineArray.reduce((sum, item) => sum + item.analyzed, 0)
  const totalApplied = timelineArray.reduce((sum, item) => sum + item.applied, 0)
  const applicationRate = totalAnalyzed > 0 ? Math.round((totalApplied / totalAnalyzed) * 100) : 0

  return {
    weeks: timelineArray,
    stats: {
      totalAnalyzed,
      totalApplied,
      applicationRate,
      weeksTracked: timelineArray.length
    }
  }
}

