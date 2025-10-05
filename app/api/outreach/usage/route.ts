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
    
    // Let PostgreSQL handle the timezone conversion using a raw query
    // This is more reliable than JavaScript date manipulation
    const { data: hourlyUsage, error: hourlyError } = await supabase
      .from('outreach_message_usage')
      .select('*')
      .eq('user_id', userId)
      .gte('generated_at', oneHourAgo.toISOString())

    // Get daily usage using PostgreSQL's timezone conversion
    // DATE(generated_at AT TIME ZONE 'timezone') converts to user's local date
    const { data: dailyUsage, error: dailyError } = await supabase.rpc('get_daily_usage', {
      p_user_id: userId,
      p_timezone: userTimezone
    }).then(async (result) => {
      // If RPC doesn't exist, fall back to a direct query with timezone conversion
      if (result.error?.code === '42883') { // function does not exist
        // Use a manual query with timezone conversion
        return await supabase
          .from('outreach_message_usage')
          .select('*')
          .eq('user_id', userId)
          .gte('generated_at', now.toISOString())
          .then(async (allData) => {
            if (allData.error) return allData
            // Filter in JavaScript by converting each timestamp to user's timezone
            const filtered = allData.data?.filter(row => {
              const rowDate = new Date(row.generated_at).toLocaleDateString('en-US', { timeZone: userTimezone })
              const todayDate = now.toLocaleDateString('en-US', { timeZone: userTimezone })
              return rowDate === todayDate
            }) || []
            return { data: filtered, error: null }
          })
      }
      return result
    })

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