import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    console.log('[Meta Backfill] Starting manual backfill process')
    
    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // Call the backfill function
    const { data, error } = await supabase.rpc('backfill_meta_daily_insights')
    
    if (error) {
      console.error('[Meta Backfill] Error running backfill:', error)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to run backfill',
        details: error.message
      }, { status: 500 })
    }
    
    console.log('[Meta Backfill] Backfill completed successfully')
    
    return NextResponse.json({
      success: true,
      message: 'Meta data backfill completed successfully',
      result: data
    })
    
  } catch (error) {
    console.error('[Meta Backfill] Error in backfill endpoint:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 