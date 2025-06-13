import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServiceClient } from '@/lib/supabase/client'

const supabase = getSupabaseServiceClient()

// Usage limits (updated to match generate-real/route.ts)
const DAILY_GENERATION_LIMIT = 5
const LEADS_PER_NICHE = 25 // Fixed 25 leads per niche
const MAX_NICHES_PER_SEARCH = 5 // Reduced to account for 25 leads per niche
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

    // Calculate when limit resets (midnight)
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)

    // Get niche usage data for cooldowns
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
      .gte('last_used_at', new Date(now.getTime() - (NICHE_COOLDOWN_HOURS * 60 * 60 * 1000)).toISOString())

    if (nicheUsageError) {
      console.error('Error fetching niche usage:', nicheUsageError)
    }

    // Process niche cooldowns
    const nicheCooldowns = (nicheUsageData || []).map((usage: any) => ({
      niche_id: usage.niche_id,
      niche_name: usage.lead_niches?.name || 'Unknown',
      niche_category: usage.lead_niches?.category || 'Unknown',
      last_used_at: usage.last_used_at,
      leads_generated: usage.leads_generated,
      cooldown_until: new Date(new Date(usage.last_used_at).getTime() + (NICHE_COOLDOWN_HOURS * 60 * 60 * 1000)),
      cooldown_remaining_ms: Math.max(0, new Date(new Date(usage.last_used_at).getTime() + (NICHE_COOLDOWN_HOURS * 60 * 60 * 1000)).getTime() - now.getTime())
    }))

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