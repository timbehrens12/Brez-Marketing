import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()

    console.log(`[Clean Duplicates] Starting duplicate Meta data cleanup...`)

    // Remove duplicate account-level records where real ad-level data exists
    const { data, error } = await supabase.rpc('clean_meta_duplicates')
    
    if (error) {
      // Fallback to direct SQL if RPC doesn't exist
      const { data: deleteResult, error: deleteError } = await supabase
        .from('meta_ad_daily_insights')
        .delete()
        .eq('ad_id', 'account_level_data')
        .in('date', 
          // Subquery to find dates with real ad-level data
          supabase
            .from('meta_ad_daily_insights')
            .select('date')
            .neq('ad_id', 'account_level_data')
        )

      if (deleteError) {
        console.error(`[Clean Duplicates] ❌ Error:`, deleteError)
        return NextResponse.json({ 
          success: false, 
          error: deleteError.message 
        }, { status: 500 })
      }

      console.log(`[Clean Duplicates] ✅ Cleaned duplicates using direct SQL`)
    } else {
      console.log(`[Clean Duplicates] ✅ Cleaned duplicates using RPC`)
    }

    // Get summary of remaining data
    const { data: summary, error: summaryError } = await supabase
      .from('meta_ad_daily_insights')
      .select('brand_id, date, ad_id, spent')
      .order('date', { ascending: false })
      .limit(10)

    if (summaryError) {
      console.error(`[Clean Duplicates] ⚠️ Could not fetch summary:`, summaryError)
    }

    return NextResponse.json({
      success: true,
      message: 'Meta data duplicates cleaned successfully',
      remaining_records: summary?.length || 0,
      sample_data: summary?.slice(0, 5) || []
    })

  } catch (error) {
    console.error(`[Clean Duplicates] ❌ Unexpected error:`, error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
