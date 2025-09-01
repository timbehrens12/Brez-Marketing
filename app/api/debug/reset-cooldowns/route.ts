import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServiceClient } from '@/lib/supabase/client'

const supabase = getSupabaseServiceClient()

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    // Delete user's daily usage data
    const { error: usageError } = await supabase
      .from('user_usage')
      .delete()
      .eq('user_id', userId)

    if (usageError) {
      console.error('Error clearing usage data:', usageError)
    }

    // Delete user's niche cooldown data
    const { error: nicheError } = await supabase
      .from('user_niche_usage')
      .delete()
      .eq('user_id', userId)

    if (nicheError) {
      console.error('Error clearing niche usage data:', nicheError)
    }

    return NextResponse.json({
      success: true,
      message: 'All cooldowns and usage limits have been reset',
      resetData: {
        usageDataCleared: !usageError,
        nicheCooldownsCleared: !nicheError
      }
    })

  } catch (error) {
    console.error('Error resetting cooldowns:', error)
    return NextResponse.json({ 
      error: 'Failed to reset cooldowns',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 