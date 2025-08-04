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
    
    // Calculate start of current day (midnight) for proper daily reset
    const startOfToday = new Date(now)
    startOfToday.setHours(0, 0, 0, 0)

    // Get hourly usage (rolling 1 hour)
    const { data: hourlyUsage, error: hourlyError } = await supabase
      .from('outreach_message_usage')
      .select('*')
      .eq('user_id', userId)
      .gte('generated_at', oneHourAgo.toISOString())

    // Get daily usage (since midnight today)
    const { data: dailyUsage, error: dailyError } = await supabase
      .from('outreach_message_usage')
      .select('*')
      .eq('user_id', userId)
      .gte('generated_at', startOfToday.toISOString())

    if (hourlyError || dailyError) {
      console.error('❌ Error fetching usage:', hourlyError || dailyError)
      return NextResponse.json({ 
        error: 'Failed to fetch usage data' 
      }, { status: 500 })
    }

    const hourlyCount = hourlyUsage?.length || 0
    const dailyCount = dailyUsage?.length || 0
    const dailyCost = dailyUsage?.reduce((sum, usage) => sum + (usage.estimated_cost || 0.02), 0) || 0

    // Calculate next reset times
    const nextHourReset = new Date(Math.ceil(now.getTime() / (60 * 60 * 1000)) * (60 * 60 * 1000))
    
    // Next daily reset is tomorrow at midnight
    const nextDayReset = new Date(startOfToday)
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