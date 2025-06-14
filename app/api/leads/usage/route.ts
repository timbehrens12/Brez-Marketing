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

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    const now = new Date()
    const today = now.toISOString().split('T')[0]
    
    // Calculate time until midnight consistently
    const nextMidnight = new Date(now)
    nextMidnight.setHours(24, 0, 0, 0) // Sets to midnight of next day
    
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)

    // Get today's usage
    const { data: usageData, error: usageError } = await supabase
      .from('user_usage')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single()

    if (usageError && usageError.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Error fetching usage:', usageError)
      return NextResponse.json({ error: 'Failed to fetch usage' }, { status: 500 })
    }

    const currentUsage = usageData?.generation_count || 0
    const leadsGeneratedToday = usageData?.leads_generated || 0
    const lastGenerationAt = usageData?.last_generation_at || null

    // Get niche usage data for cooldowns - only show niches used today (which are on cooldown until midnight)
    const startOfToday = new Date(now)
    startOfToday.setHours(0, 0, 0, 0)
    
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
    
    // Process niche cooldowns - only niches used today are on cooldown until midnight
    const nicheCooldowns = (nicheUsageData || [])
      .filter((usage: any) => {
        if (!usage.lead_niches) return false
        
        // Double-check that the usage is from today
        const usageDate = new Date(usage.last_used_at)
        const usageDay = usageDate.toISOString().split('T')[0]
        const todayDay = now.toISOString().split('T')[0]
        const isToday = usageDay === todayDay
        
        return isToday
      })
      .map((usage: any) => {
        const timeUntilMidnight = nextMidnight.getTime() - now.getTime()
        
        return {
          niche_id: usage.niche_id,
          niche_name: usage.lead_niches.name,
          niche_category: usage.lead_niches.category,
          last_used_at: usage.last_used_at,
          leads_generated: usage.leads_generated,
          cooldown_until: nextMidnight.toISOString(),
          cooldown_remaining_ms: timeUntilMidnight
        }
      }).filter(cooldown => cooldown.cooldown_remaining_ms > 0)

    return NextResponse.json({
      usage: {
        used: currentUsage,
        limit: DAILY_GENERATION_LIMIT,
        remaining: Math.max(0, DAILY_GENERATION_LIMIT - currentUsage),
        leadsGeneratedToday,
        leadsPerNiche: LEADS_PER_NICHE,
        maxNichesPerSearch: MAX_NICHES_PER_SEARCH,
        lastGenerationAt,
        resetsAt: nextMidnight.toISOString(),
        resetsIn: nextMidnight.getTime() - now.getTime(),
        nicheCooldowns,
        cooldownHours: NICHE_COOLDOWN_HOURS
      }
    })

  } catch (error) {
    console.error('Error fetching usage data:', error)
    return NextResponse.json({ error: 'Failed to fetch usage data' }, { status: 500 })
  }
} 