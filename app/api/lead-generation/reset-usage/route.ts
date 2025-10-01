import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedSupabaseClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    const supabase = await getAuthenticatedSupabaseClient()

    // Delete existing usage record to reset
    const { error: deleteError } = await supabase
      .from('lead_generation_usage')
      .delete()
      .eq('user_id', userId)

    if (deleteError) {
      console.error('Error resetting usage:', deleteError)
      return NextResponse.json({ error: 'Failed to reset usage' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: 'Usage reset successfully'
    })

  } catch (error) {
    console.error('Error in reset-usage API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

