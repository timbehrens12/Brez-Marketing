import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = createClient()

    console.log('[Unique Constraint] Adding unique constraint to prevent data doubling...')

    // Add unique constraint to prevent duplicate brand_id + date + ad_id combinations
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        -- First, remove any existing duplicates
        DELETE FROM meta_ad_daily_insights a
        USING meta_ad_daily_insights b
        WHERE a.id > b.id 
          AND a.brand_id = b.brand_id 
          AND a.date = b.date 
          AND a.ad_id = b.ad_id;

        -- Add unique constraint if it doesn't exist
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'meta_ad_daily_insights_unique_brand_date_ad'
          ) THEN
            ALTER TABLE meta_ad_daily_insights 
            ADD CONSTRAINT meta_ad_daily_insights_unique_brand_date_ad 
            UNIQUE (brand_id, date, ad_id);
          END IF;
        END $$;
      `
    })

    if (error) {
      console.error('[Unique Constraint] Error:', error)
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 })
    }

    console.log('[Unique Constraint] ✅ Unique constraint added successfully')

    return NextResponse.json({ 
      success: true, 
      message: 'Unique constraint added to prevent data doubling',
      result: data
    })

  } catch (error) {
    console.error('[Unique Constraint] Unexpected error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
