import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@/lib/supabase/server'

const WEEKLY_CREATIVE_LIMIT = 80
const USAGE_FEATURE_TYPE = 'creative_generation'

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Check weekly usage limits
    const supabase = createClient()
    const now = new Date()
    
    // Calculate start of current week (Monday at 12:00 AM)
    const dayOfWeek = now.getDay()
    const startOfWeek = new Date(now)
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    startOfWeek.setDate(now.getDate() - daysToSubtract)
    startOfWeek.setHours(0, 0, 0, 0)
    
    const startOfNextWeek = new Date(startOfWeek)
    startOfNextWeek.setDate(startOfWeek.getDate() + 7)
    
    // Check user's weekly usage
    const { data: usageData, error: usageError } = await supabase
      .from('ai_feature_usage')
      .select('*')
      .eq('user_id', userId)
      .eq('feature_type', USAGE_FEATURE_TYPE)
      .gte('created_at', startOfWeek.toISOString())
      .lt('created_at', startOfNextWeek.toISOString())

    if (usageError) {
      console.error('Error checking creative usage:', usageError)
      return NextResponse.json({ error: 'Failed to check usage limits' }, { status: 500 })
    }

    const currentWeeklyUsage = usageData?.length || 0
    
    return NextResponse.json({
      usage: {
        current: currentWeeklyUsage,
        limit: WEEKLY_CREATIVE_LIMIT,
        remaining: WEEKLY_CREATIVE_LIMIT - currentWeeklyUsage,
        weekStartDate: startOfWeek.toISOString().split('T')[0],
        resetsAt: startOfNextWeek.toISOString()
      }
    })
    
  } catch (error: any) {
    console.error('Error fetching creative usage:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
