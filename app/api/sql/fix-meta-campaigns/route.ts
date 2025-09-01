import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs'

export const dynamic = 'force-dynamic'

// SQL script to add last_budget_refresh column if it doesn't exist
const addLastBudgetRefreshColumnSQL = `
-- Add last_budget_refresh column to meta_campaigns table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'meta_campaigns'
    AND column_name = 'last_budget_refresh'
  ) THEN
    ALTER TABLE public.meta_campaigns 
    ADD COLUMN last_budget_refresh TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    
    -- Add comment for documentation
    COMMENT ON COLUMN public.meta_campaigns.last_budget_refresh IS 'Timestamp of when the campaign budget was last refreshed from Meta API';
    
    RAISE NOTICE 'Added last_budget_refresh column to meta_campaigns table';
  ELSE
    RAISE NOTICE 'last_budget_refresh column already exists in meta_campaigns table';
  END IF;
END $$;
`

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    console.log('Running SQL to add last_budget_refresh column to meta_campaigns table...')
    
    // Execute SQL script
    const { data, error } = await supabase.rpc('pgpsql', { query: addLastBudgetRefreshColumnSQL })

    if (error) {
      console.error('Error executing SQL:', error)
      return NextResponse.json(
        { error: 'Failed to execute SQL', details: error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully added last_budget_refresh column to meta_campaigns table',
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Unexpected error', details: error.message },
      { status: 500 }
    )
  }
} 