import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs'

export const dynamic = 'force-dynamic'

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

    // SQL for adding column
    const columnSQL = `
    ALTER TABLE public.meta_campaigns 
    ADD COLUMN IF NOT EXISTS last_budget_refresh TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    
    COMMENT ON COLUMN public.meta_campaigns.last_budget_refresh IS 'Timestamp of when the campaign budget was last refreshed from Meta API';
    `;

    // Execute SQL directly 
    const { error } = await supabase.rpc('execute_sql', { 
      sql_query: columnSQL 
    });

    if (error) {
      console.error('Error adding column:', error);
      return NextResponse.json({ 
        success: false, 
        error: error.message
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully added last_budget_refresh column to meta_campaigns table'
    });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { 
        error: 'Unexpected error', 
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
} 