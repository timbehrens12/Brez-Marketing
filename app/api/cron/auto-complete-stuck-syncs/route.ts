import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * FINAL NUCLEAR SOLUTION: Auto-complete stuck Meta syncs
 * This endpoint runs every minute to prevent any sync from being stuck > 5 minutes
 * 
 * Called by Vercel cron: every minute
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🚨 [Auto-Complete Stuck Syncs] Running nuclear sync protection...')

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Call the database function to auto-complete stuck syncs
    const { error } = await supabase.rpc('auto_complete_stuck_meta_syncs')

    if (error) {
      console.error('❌ [Auto-Complete Stuck Syncs] Database function failed:', error)
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 })
    }

    console.log('✅ [Auto-Complete Stuck Syncs] Nuclear protection completed')
    
    return NextResponse.json({ 
      success: true, 
      message: 'Nuclear sync protection executed successfully',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('💥 [Auto-Complete Stuck Syncs] Critical error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
