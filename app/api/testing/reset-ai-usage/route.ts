import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// TESTING ENDPOINT - Clear all AI usage tracking data
export async function POST(req: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Optional: Add admin check here if you want to restrict access
    // const allowedAdminIds = ['your-clerk-user-id']
    // if (!allowedAdminIds.includes(userId)) {
    //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    // }

    console.log('🧹 Clearing all AI usage tracking data for testing...')

    // Clear ai_usage_logs
    const { error: logsError, count: logsDeleted } = await supabase
      .from('ai_usage_logs')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

    if (logsError) {
      console.error('Error clearing ai_usage_logs:', logsError)
    }

    // Clear ai_usage_tracking
    const { error: trackingError, count: trackingDeleted } = await supabase
      .from('ai_usage_tracking')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

    if (trackingError) {
      console.error('Error clearing ai_usage_tracking:', trackingError)
    }

    // Get final counts
    const { count: remainingLogs } = await supabase
      .from('ai_usage_logs')
      .select('*', { count: 'exact', head: true })

    const { count: remainingTracking } = await supabase
      .from('ai_usage_tracking')
      .select('*', { count: 'exact', head: true })

    console.log('✅ AI usage data cleared:', {
      logsDeleted,
      trackingDeleted,
      remainingLogs,
      remainingTracking
    })

    return NextResponse.json({
      success: true,
      message: 'AI usage tracking data cleared successfully',
      deleted: {
        logs: logsDeleted,
        tracking: trackingDeleted
      },
      remaining: {
        logs: remainingLogs || 0,
        tracking: remainingTracking || 0
      }
    })

  } catch (error) {
    console.error('Error clearing AI usage data:', error)
    return NextResponse.json({ 
      error: 'Failed to clear AI usage data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

