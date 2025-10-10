import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const DEFAULT_MONTHLY_LIMIT = 25
const USAGE_FEATURE_TYPE = 'creative_generation'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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

    // Get user's tier limits
    const { data: tierData, error: tierError } = await supabaseAdmin.rpc('get_user_tier_limits', {
      p_user_id: userId
    })
    
    const tierLimits = tierData?.[0]
    const monthlyLimit = tierLimits?.creative_gen_monthly || DEFAULT_MONTHLY_LIMIT
    
    // Check monthly usage limits (changed from weekly)
    const supabase = createClient()
    
    // Get user's timezone from request header or default to America/Chicago
    const userTimezone = request.headers.get('x-user-timezone') || 'America/Chicago'
    
    // Calculate the start of the current month
    const now = new Date()
    const localNow = new Date(now.toLocaleString('en-US', { timeZone: userTimezone }))
    
    const startOfMonthLocal = new Date(localNow.getFullYear(), localNow.getMonth(), 1)
    startOfMonthLocal.setHours(0, 0, 0, 0)
    
    const startOfNextMonthLocal = new Date(localNow.getFullYear(), localNow.getMonth() + 1, 1)
    startOfNextMonthLocal.setHours(0, 0, 0, 0)
    
    console.log(`[Creative Usage] User timezone: ${userTimezone}, Local now: ${localNow.toISOString()}, Month starts: ${startOfMonthLocal.toISOString()}`)
    
    // Get monthly usage from ai_usage_tracking
    const { data: monthlyUsageData, error: monthlyError } = await supabaseAdmin
      .from('ai_usage_tracking')
      .select('*')
      .eq('user_id', userId)
      .eq('feature_type', USAGE_FEATURE_TYPE)
      .gte('monthly_usage_month', startOfMonthLocal.toISOString().split('T')[0])
    
    const currentMonthlyUsage = monthlyUsageData?.reduce((sum, record) => sum + (record.monthly_usage_count || 0), 0) || 0
    
    // Also get legacy data for backwards compatibility
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
    
    console.log(`[Creative Usage] Monthly usage: ${currentMonthlyUsage}, Limit: ${monthlyLimit}`)
    
    return NextResponse.json({
      usage: {
        current: currentMonthlyUsage,
        limit: monthlyLimit,
        remaining: Math.max(0, monthlyLimit - currentMonthlyUsage),
        monthStartDate: startOfMonthLocal.toISOString().split('T')[0],
        resetsAt: startOfNextMonthLocal.toISOString(),
        tierName: tierLimits?.display_name || 'Unknown'
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
