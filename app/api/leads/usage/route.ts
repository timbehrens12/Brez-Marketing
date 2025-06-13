import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServiceClient } from '@/lib/supabase/client'

const supabase = getSupabaseServiceClient()

// Usage limits (should match generate-real/route.ts)
const DAILY_GENERATION_LIMIT = 20
const LEADS_PER_GENERATION = 50
const MAX_NICHES_PER_SEARCH = 10

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    const today = new Date().toISOString().split('T')[0]
    
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

    // Calculate when limit resets (midnight local time)
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)

    return NextResponse.json({
      usage: {
        used: currentUsage,
        limit: DAILY_GENERATION_LIMIT,
        remaining: Math.max(0, DAILY_GENERATION_LIMIT - currentUsage),
        leadsGeneratedToday,
        maxLeadsPerGeneration: LEADS_PER_GENERATION,
        maxNichesPerSearch: MAX_NICHES_PER_SEARCH,
        lastGenerationAt,
        resetsAt: tomorrow.toISOString(),
        resetsIn: tomorrow.getTime() - Date.now()
      }
    })

  } catch (error) {
    console.error('Error in usage endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 