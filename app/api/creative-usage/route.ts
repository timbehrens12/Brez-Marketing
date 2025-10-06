import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@/lib/supabase/server'

const WEEKLY_CREATIVE_LIMIT = 25
const USAGE_FEATURE_TYPE = 'creative_generation'

export async function DELETE(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Delete all creative usage records for this user
    const supabase = createClient()
    const { error } = await supabase
      .from('ai_feature_usage')
      .delete()
      .eq('user_id', userId)
      .eq('feature_type', USAGE_FEATURE_TYPE)

    if (error) {
      console.error('Error resetting creative usage:', error)
      return NextResponse.json({ error: 'Failed to reset usage' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Creative usage reset successfully' })
    
  } catch (error: any) {
    console.error('Error resetting creative usage:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Check weekly usage limits
    const supabase = createClient()
    
    // Get user's timezone from request header or default to America/Chicago
    const userTimezone = request.headers.get('x-user-timezone') || 'America/Chicago'
    
    // Calculate the start of the week (Monday) in the user's local timezone
    // Then query for all records created since that time
    const now = new Date()
    const localNow = new Date(now.toLocaleString('en-US', { timeZone: userTimezone }))
    const dayOfWeek = localNow.getDay()
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Monday = 0 days back
    
    const startOfWeekLocal = new Date(localNow)
    startOfWeekLocal.setDate(localNow.getDate() - daysToSubtract)
    startOfWeekLocal.setHours(0, 0, 0, 0)
    
    const startOfNextWeekLocal = new Date(startOfWeekLocal)
    startOfNextWeekLocal.setDate(startOfWeekLocal.getDate() + 7)
    
    console.log(`[Creative Usage] User timezone: ${userTimezone}, Local now: ${localNow.toISOString()}, Week starts: ${startOfWeekLocal.toISOString()}`)
    
    // Fetch ALL usage records and filter in JavaScript based on local time
    // This is more reliable than timezone conversion in the query
    const { data: allUsageData, error: usageError } = await supabase
      .from('ai_feature_usage')
      .select('*')
      .eq('user_id', userId)
      .eq('feature_type', USAGE_FEATURE_TYPE)
      .order('created_at', { ascending: false })
    
    if (usageError) {
      console.error('Error checking creative usage:', usageError)
      return NextResponse.json({ error: 'Failed to check usage limits' }, { status: 500 })
    }
    
    // Filter records that fall within this week in user's local timezone
    const usageData = allUsageData?.filter(record => {
      const recordDate = new Date(record.created_at)
      const recordLocalDate = new Date(recordDate.toLocaleString('en-US', { timeZone: userTimezone }))
      return recordLocalDate >= startOfWeekLocal && recordLocalDate < startOfNextWeekLocal
    }) || []
    
    console.log(`[Creative Usage] Total records: ${allUsageData?.length}, This week (local): ${usageData.length}`)

    const currentWeeklyUsage = usageData.length
    
    return NextResponse.json({
      usage: {
        current: currentWeeklyUsage,
        limit: WEEKLY_CREATIVE_LIMIT,
        remaining: WEEKLY_CREATIVE_LIMIT - currentWeeklyUsage,
        weekStartDate: startOfWeekLocal.toISOString().split('T')[0],
        resetsAt: startOfNextWeekLocal.toISOString()
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
