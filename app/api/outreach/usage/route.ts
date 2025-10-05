import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Security Configuration
const SECURITY_LIMITS = {
  MAX_MESSAGES_PER_HOUR: 15,      // Max 15 messages per hour per user
  MAX_MESSAGES_PER_DAY: 25,       // Max 25 messages per day per user
  MAX_MESSAGES_PER_LEAD: 3,       // Max 3 messages per lead (prevent spam to same person)
  COOLDOWN_BETWEEN_MESSAGES: 30,  // 30 seconds between message generations
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'Please log in to view usage'
      }, { status: 401 })
    }

    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    
    // Get user's timezone from request header or default to Central Time
    const userTimezone = request.headers.get('x-user-timezone') || 'America/Chicago'
    
    // Use centralized ai_usage_logs table for outreach tracking
    // This ensures consistency with other AI features
    const { data: hourlyUsage, error: hourlyError } = await supabase
      .from('ai_usage_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('endpoint', 'outreach_messages')
      .gte('created_at', oneHourAgo.toISOString())

    // Get daily usage using timezone-aware filtering
    // Calculate start of today in user's timezone
    const todayInUserTz = new Date(now.toLocaleString('en-US', { timeZone: userTimezone }))
    const startOfTodayInUserTz = new Date(todayInUserTz)
    startOfTodayInUserTz.setHours(0, 0, 0, 0)
    
    // Get all records from start of today onwards (in user's timezone)
    const { data: allUsageData, error: dailyError } = await supabase
      .from('ai_usage_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('endpoint', 'outreach_messages')
      .gte('created_at', startOfTodayInUserTz.toISOString())
    
    const dailyUsage = allUsageData

    if (hourlyError || dailyError) {
      console.error('❌ Error fetching usage:', hourlyError || dailyError)
      return NextResponse.json({ 
        error: 'Failed to fetch usage data' 
      }, { status: 500 })
    }

    const hourlyCount = hourlyUsage?.length || 0
    const dailyCount = dailyUsage?.length || 0
    const dailyCost = dailyUsage?.reduce((sum, usage) => sum + (usage.estimated_cost || 0.02), 0) || 0
    
    console.log('📊 Usage API Debug:', {
      userTimezone,
      hourlyCount,
      dailyCount,
      dailyCost,
      hourlyUsageLength: hourlyUsage?.length,
      dailyUsageLength: dailyUsage?.length,
      todayDate: now.toLocaleDateString('en-US', { timeZone: userTimezone }),
      startOfTodayInUserTz: startOfTodayInUserTz.toISOString(),
      now: now.toISOString()
    })

    // Calculate next reset times
    const nextHourReset = new Date(Math.ceil(now.getTime() / (60 * 60 * 1000)) * (60 * 60 * 1000))
    
    // Next daily reset is tomorrow at midnight in user's timezone
    // Get today's date in user's timezone, then add 1 day
    const todayInUserTz = new Date(now.toLocaleString('en-US', { timeZone: userTimezone }))
    const nextDayReset = new Date(todayInUserTz)
    nextDayReset.setDate(nextDayReset.getDate() + 1)
    nextDayReset.setHours(0, 0, 0, 0)

    return NextResponse.json({
      usage: {
        hourly: {
          used: hourlyCount,
          limit: SECURITY_LIMITS.MAX_MESSAGES_PER_HOUR,
          remaining: Math.max(0, SECURITY_LIMITS.MAX_MESSAGES_PER_HOUR - hourlyCount),
          resetsAt: nextHourReset.toISOString()
        },
        daily: {
          used: dailyCount,
          limit: SECURITY_LIMITS.MAX_MESSAGES_PER_DAY,
          remaining: Math.max(0, SECURITY_LIMITS.MAX_MESSAGES_PER_DAY - dailyCount),
          resetsAt: nextDayReset.toISOString()
        },
        cost: {
          daily: dailyCost.toFixed(2)
        }
      }
    })

  } catch (error) {
    console.error('❌ Error in usage endpoint:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
} 