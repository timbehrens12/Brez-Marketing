import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedSupabaseClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    const supabase = await getAuthenticatedSupabaseClient()

    // Delete user_usage records (daily generation count)
    const { error: usageError } = await supabase
      .from('user_usage')
      .delete()
      .eq('user_id', userId)

    if (usageError) {
      console.error('Error resetting user_usage:', usageError)
    }

    // Delete user_niche_usage records (niche cooldowns)
    const { error: nicheError } = await supabase
      .from('user_niche_usage')
      .delete()
      .eq('user_id', userId)

    if (nicheError) {
      console.error('Error resetting user_niche_usage:', nicheError)
    }

    return NextResponse.json({ 
      success: true,
      message: 'Usage and niche cooldowns reset successfully'
    })

  } catch (error) {
    console.error('Error in reset-usage API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

