import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Security Configuration (per-hour limits still apply for rate limiting)
const SECURITY_LIMITS = {
  MAX_MESSAGES_PER_HOUR: 15,      // Max 15 messages per hour per user (rate limit)
  DEFAULT_MONTHLY_LIMIT: 250,     // Default monthly limit
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

    // Get user's tier limits
    const { data: tierData, error: tierError } = await supabase.rpc('get_user_tier_limits', {
      p_user_id: userId
    })
    
    const tierLimits = tierData?.[0]
    const monthlyLimit = tierLimits?.outreach_messages_monthly || SECURITY_LIMITS.DEFAULT_MONTHLY_LIMIT
    
    // Get user's billing interval
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('billing_interval')
      .eq('user_id', userId)
      .single()
    
    const billingInterval = subscription?.billing_interval || 'month'
    
    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    
    // Get user's timezone from request header or default to Central Time
    const userTimezone = request.headers.get('x-user-timezone') || 'America/Chicago'
    
    // Calculate start of current month
    const localNow = new Date(now.toLocaleString('en-US', { timeZone: userTimezone }))
    const startOfMonth = new Date(localNow.getFullYear(), localNow.getMonth(), 1)
    startOfMonth.setHours(0, 0, 0, 0)
    
    // Calculate start of next month (for reset)
    const startOfNextMonth = new Date(localNow.getFullYear(), localNow.getMonth() + 1, 1)
    startOfNextMonth.setHours(0, 0, 0, 0)
    
    // Get monthly usage from ai_usage_tracking
    const { data: monthlyUsageData, error: monthlyError } = await supabase
      .from('ai_usage_tracking')
      .select('*')
      .eq('user_id', userId)
      .eq('feature_type', 'outreach_messages')
      .gte('monthly_usage_month', startOfMonth.toISOString().split('T')[0])
    
    const monthlyCount = monthlyUsageData?.reduce((sum, record) => sum + (record.monthly_usage_count || 0), 0) || 0
    
    // Use centralized ai_usage_logs table for outreach tracking
    // This ensures consistency with other AI features
    const { data: hourlyUsage, error: hourlyError } = await supabase
      .from('ai_usage_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('endpoint', 'outreach_messages')
      .gte('created_at', oneHourAgo.toISOString())

    // Get daily usage using timezone-aware filtering
    // Calculate today's date in user's timezone
    const localToday = `${localNow.getFullYear()}-${String(localNow.getMonth() + 1).padStart(2, '0')}-${String(localNow.getDate()).padStart(2, '0')}`
    
    console.log(`[Outreach Usage] Checking usage for ${localToday} in timezone ${userTimezone}`)
    
    // Get all usage records and filter by local date
    const { data: allUsageData, error: dailyError } = await supabase
      .from('ai_usage_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('endpoint', 'outreach_messages')
      .order('created_at', { ascending: false })
    
    // Filter records that fall on today in user's local timezone
    const dailyUsage = allUsageData?.filter(record => {
      const recordDate = new Date(record.created_at)
      const recordLocalDate = new Date(recordDate.toLocaleString('en-US', { timeZone: userTimezone }))
      const recordDateStr = `${recordLocalDate.getFullYear()}-${String(recordLocalDate.getMonth() + 1).padStart(2, '0')}-${String(recordLocalDate.getDate()).padStart(2, '0')}`
      return recordDateStr === localToday
    }) || []

    if (hourlyError || dailyError) {
      console.error('❌ Error fetching usage:', hourlyError || dailyError)
      return NextResponse.json({ 
        error: 'Failed to fetch usage data' 
      }, { status: 500 })
    }

    const hourlyCount = hourlyUsage?.length || 0
    const dailyCount = dailyUsage.length
    const dailyCost = dailyUsage.reduce((sum, usage) => sum + (usage.estimated_cost || 0.02), 0) || 0
    
    console.log('📊 Usage API Debug:', {
      userTimezone,
      hourlyCount,
      dailyCount,
      dailyCost,
      totalRecords: allUsageData?.length,
      todayRecords: dailyCount,
      todayDate: localToday,
      now: now.toISOString()
    })

    // Calculate next reset times
    const nextHourReset = new Date(Math.ceil(now.getTime() / (60 * 60 * 1000)) * (60 * 60 * 1000))
    
    // Next daily reset is tomorrow at midnight in user's timezone
    const nextDayReset = new Date(localNow)
    nextDayReset.setDate(localNow.getDate() + 1)
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
          limit: monthlyLimit, // Changed from hardcoded daily limit to tier-based monthly limit
          remaining: Math.max(0, monthlyLimit - monthlyCount), // Use monthly count for remaining
          resetsAt: nextDayReset.toISOString()
        },
        monthly: {
          used: monthlyCount,
          limit: monthlyLimit,
          remaining: Math.max(0, monthlyLimit - monthlyCount),
          resetsAt: startOfNextMonth.toISOString(),
          tierName: tierLimits?.display_name || 'Unknown',
          billingInterval
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