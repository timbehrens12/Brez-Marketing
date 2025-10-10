import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServiceClient } from '@/lib/supabase/client'
import { createClient } from '@supabase/supabase-js'

const supabase = getSupabaseServiceClient()
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Default limits (will be overridden by tier limits)
const DEFAULT_MONTHLY_LIMIT = 100 // Default monthly limit
const TOTAL_LEADS_PER_GENERATION = 25 // 25 leads per generation
const MIN_NICHES_PER_SEARCH = 1 // Minimum 1 niche per search
const MAX_NICHES_PER_SEARCH = 5 // Maximum 5 niches per search
const NICHE_COOLDOWN_HOURS = 72 // 72 hours (3 days) cooldown per niche

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const localDate = searchParams.get('localDate')
    const localStartOfDayUTC = searchParams.get('localStartOfDayUTC')

    if (!userId || !localDate || !localStartOfDayUTC) {
      return NextResponse.json({ error: 'User ID and client date information required' }, { status: 400 })
    }

    // Get user's tier limits
    const { data: tierData, error: tierError } = await supabaseAdmin.rpc('get_user_tier_limits', {
      p_user_id: userId
    })
    
    const tierLimits = tierData?.[0]
    const monthlyLimit = tierLimits?.lead_gen_monthly || DEFAULT_MONTHLY_LIMIT
    
    const now = new Date()
    const currentDate = new Date(localStartOfDayUTC)
    
    // Calculate start of current month
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    startOfMonth.setHours(0, 0, 0, 0)
    
    // Calculate start of next month (for reset)
    const startOfNextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    startOfNextMonth.setHours(0, 0, 0, 0)
    
    // Get this month's usage from ai_usage_tracking
    const { data: aiUsageData, error: aiUsageError } = await supabaseAdmin
      .from('ai_usage_tracking')
      .select('*')
      .eq('user_id', userId)
      .in('feature_type', ['lead_gen_ecommerce', 'lead_gen_enrichment'])
      .gte('monthly_usage_month', startOfMonth.toISOString().split('T')[0])
    
    // Sum up monthly usage
    const currentMonthlyUsage = aiUsageData?.reduce((sum, record) => sum + (record.monthly_usage_count || 0), 0) || 0
    
    // Also get legacy user_usage data for backwards compatibility
    const { data: usageData, error: usageError } = await supabase
      .from('user_usage')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startOfMonth.toISOString().split('T')[0])
      .lt('date', startOfNextMonth.toISOString().split('T')[0])
    
    if (usageError) {
      console.error('Error fetching usage:', usageError)
      return NextResponse.json({ error: 'Failed to fetch usage' }, { status: 500 })
    }

    // Use currentMonthlyUsage as the primary usage count
    const leadsGeneratedThisMonth = usageData?.reduce((sum, record) => sum + (record.leads_generated || 0), 0) || 0
    const lastGenerationAt = usageData?.sort((a, b) => new Date(b.last_generation_at || 0).getTime() - new Date(a.last_generation_at || 0).getTime())[0]?.last_generation_at || null

    // Calculate when limit resets (1st of next month)
    const resetTime = startOfNextMonth.getTime()
    const timeUntilReset = resetTime - now.getTime()

    // Get niche cooldowns for this month
    const { data: nicheUsageData, error: nicheUsageError } = await supabase
      .from('user_niche_usage')
      .select('*')
      .eq('user_id', userId)
      .gte('last_used_at', startOfMonth.toISOString())

    const nicheCooldowns = nicheUsageData?.map(usage => {
      const cooldownUntil = new Date(new Date(usage.last_used_at).getTime() + (NICHE_COOLDOWN_HOURS * 60 * 60 * 1000))
      return {
        niche_id: usage.niche_id,
        niche_name: usage.niche_name || 'Unknown',
        niche_category: usage.niche_category || 'Unknown',
        last_used_at: usage.last_used_at,
        leads_generated: usage.leads_generated || 0,
        cooldown_until: cooldownUntil.toISOString(),
        cooldown_remaining_ms: Math.max(0, cooldownUntil.getTime() - now.getTime())
      }
    }) || []

    return NextResponse.json({
      usage: {
        used: currentMonthlyUsage,
        limit: monthlyLimit,
        remaining: Math.max(0, monthlyLimit - currentMonthlyUsage),
        leadsGeneratedThisMonth,
        leadsPerNiche: TOTAL_LEADS_PER_GENERATION,
        maxNichesPerSearch: MAX_NICHES_PER_SEARCH,
        minNichesPerSearch: MIN_NICHES_PER_SEARCH,
        lastGenerationAt,
        resetsAt: startOfNextMonth.toISOString(),
        resetsIn: timeUntilReset,
        nicheCooldowns,
        cooldownHours: NICHE_COOLDOWN_HOURS,
        tierName: tierLimits?.display_name || 'Unknown'
      }
    })

  } catch (error) {
    console.error('Error fetching usage data:', error)
    return NextResponse.json({ error: 'Failed to fetch usage data' }, { status: 500 })
  }
} 