import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServiceClient } from '@/lib/supabase/client'

const supabase = getSupabaseServiceClient()

// Usage limits (updated to match generate-real/route.ts)
const DAILY_GENERATION_LIMIT = 5
const LEADS_PER_NICHE = 15 // Reduced from 25 to 15 for faster processing
const MAX_NICHES_PER_SEARCH = 3 // Reduced from 5 to 3 for faster processing
const NICHE_COOLDOWN_HOURS = 24

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
    
    // Get today's usage using the client's provided local date
    const { data: usageData, error: usageError } = await supabase
      .from('user_usage')
      .select('*')
      .eq('user_id', userId)
      .eq('date', localDate) // Use client's local date
      .single()

    if (usageError && usageError.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Error fetching usage:', usageError)
      return NextResponse.json({ error: 'Failed to fetch usage' }, { status: 500 })
    }

    const currentUsage = usageData?.generation_count || 0
    const leadsGeneratedToday = usageData?.leads_generated || 0
    const lastGenerationAt = usageData?.last_generation_at || null

    // Calculate when limit resets (midnight in user's local timezone)
    const startOfUserDay = new Date(localStartOfDayUTC);
    const tomorrow = new Date(startOfUserDay);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get niche usage data for cooldowns - only show niches used since the start of the user's day
    const startOfToday = new Date(localStartOfDayUTC);
    
    const { data: nicheUsageData, error: nicheUsageError } = await supabase
      .from('user_niche_usage')
      .select(`
        niche_id,
        last_used_at,
        leads_generated,
        lead_niches (
          id,
          name,
          category
        )
      `)
      .eq('user_id', userId)
      .gte('last_used_at', startOfToday.toISOString())

    if (nicheUsageError) {
      console.error('Error fetching niche usage:', nicheUsageError)
    }

    console.log('Found niche usage data:', nicheUsageData?.length || 0, 'entries')

    // Process niche cooldowns
    const nicheCooldowns = nicheUsageData
      ?.filter(usage => usage.lead_niches) // Filter out usage with no niche data
      .map(usage => {
        // A niche used today is on cooldown until midnight (user's timezone).
        // The `tomorrow` variable represents the start of the user's next day (their local midnight).
        const cooldownUntil = tomorrow;
        
        // Fix type issue: Supabase might return a single object or an array for relationships
        const nicheInfo = Array.isArray(usage.lead_niches) ? usage.lead_niches[0] : usage.lead_niches;

        const cooldownRemainingMs = Math.max(0, cooldownUntil.getTime() - now.getTime())

        return {
      niche_id: usage.niche_id,
          niche_name: nicheInfo.name,
          niche_category: nicheInfo.category,
      last_used_at: usage.last_used_at,
      leads_generated: usage.leads_generated,
          cooldown_until: cooldownUntil.toISOString(),
          cooldown_remaining_ms: cooldownRemainingMs
        }
      })
      // Any niche returned by the query was used today, so it is on cooldown until midnight.
      ?? []

    console.log('Processed cooldowns:', nicheCooldowns.length, 'active cooldowns')

    return NextResponse.json({
      usage: {
        used: currentUsage,
        limit: DAILY_GENERATION_LIMIT,
        remaining: Math.max(0, DAILY_GENERATION_LIMIT - currentUsage),
        leadsGeneratedToday,
        leadsPerNiche: LEADS_PER_NICHE,
        maxNichesPerSearch: MAX_NICHES_PER_SEARCH,
        lastGenerationAt,
        resetsAt: tomorrow.toISOString(),
        resetsIn: tomorrow.getTime() - now.getTime(),
        nicheCooldowns,
        cooldownHours: NICHE_COOLDOWN_HOURS
      }
    })

  } catch (error) {
    console.error('Error fetching usage data:', error)
    return NextResponse.json({ error: 'Failed to fetch usage data' }, { status: 500 })
  }
} 