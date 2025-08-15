import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServiceClient } from '@/lib/supabase/client'

const supabase = getSupabaseServiceClient()

// Usage limits for weekly system
const WEEKLY_GENERATION_LIMIT = 1 // 1 generation per week for cost control
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

    const now = new Date()
    
    // Calculate start of current week (Monday at 12:00 AM) using user's local timezone
    const currentDate = new Date(localStartOfDayUTC)
    const dayOfWeek = currentDate.getDay()
    const startOfWeek = new Date(currentDate)
    
    // Calculate days to subtract to get to Monday
    // Sunday = 0, Monday = 1, Tuesday = 2, etc.
    // If Sunday (0), subtract 6 days to get to previous Monday
    // If Monday (1), subtract 0 days (already Monday)
    // If Tuesday (2), subtract 1 day to get to Monday, etc.
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    startOfWeek.setDate(currentDate.getDate() - daysToSubtract)
    startOfWeek.setHours(0, 0, 0, 0) // Set to midnight
    
    // Next reset is next Monday at 12:00 AM (Sunday night at midnight)
    const startOfNextWeek = new Date(startOfWeek)
    startOfNextWeek.setDate(startOfWeek.getDate() + 7)
    startOfNextWeek.setHours(0, 0, 0, 0) // Ensure it's exactly midnight
    
    // Get this week's usage using the client's timezone
    const { data: usageData, error: usageError } = await supabase
      .from('user_usage')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startOfWeek.toISOString().split('T')[0]) // Start of week
      .lt('date', startOfNextWeek.toISOString().split('T')[0]) // End of week
    
    if (usageError) {
      console.error('Error fetching usage:', usageError)
      return NextResponse.json({ error: 'Failed to fetch usage' }, { status: 500 })
    }

    // Sum up generation count for the week
    const currentWeeklyUsage = usageData?.reduce((sum, record) => sum + (record.generation_count || 0), 0) || 0
    const leadsGeneratedThisWeek = usageData?.reduce((sum, record) => sum + (record.leads_generated || 0), 0) || 0
    const lastGenerationAt = usageData?.sort((a, b) => new Date(b.last_generation_at || 0).getTime() - new Date(a.last_generation_at || 0).getTime())[0]?.last_generation_at || null

    // Calculate when limit resets (next Monday)
    const resetTime = startOfNextWeek.getTime()
    const timeUntilReset = resetTime - now.getTime()

    // Get niche cooldowns for this week
    const { data: nicheUsageData, error: nicheUsageError } = await supabase
      .from('user_niche_usage')
      .select('*')
      .eq('user_id', userId)
      .gte('last_used_at', startOfWeek.toISOString())

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
        used: currentWeeklyUsage,
        limit: WEEKLY_GENERATION_LIMIT,
        remaining: Math.max(0, WEEKLY_GENERATION_LIMIT - currentWeeklyUsage),
        leadsGeneratedThisWeek,
        leadsPerNiche: TOTAL_LEADS_PER_GENERATION,
        maxNichesPerSearch: MAX_NICHES_PER_SEARCH,
        minNichesPerSearch: MIN_NICHES_PER_SEARCH,
        lastGenerationAt,
        resetsAt: startOfNextWeek.toISOString(),
        resetsIn: timeUntilReset,
        nicheCooldowns,
        cooldownHours: NICHE_COOLDOWN_HOURS
      }
    })

  } catch (error) {
    console.error('Error fetching usage data:', error)
    return NextResponse.json({ error: 'Failed to fetch usage data' }, { status: 500 })
  }
} 