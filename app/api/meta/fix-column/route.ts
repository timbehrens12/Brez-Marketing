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

    console.log('Checking if last_budget_refresh column exists...')
    
    // First check if the column already exists
    const { data: columnExists, error: checkError } = await supabase
      .from('meta_campaigns')
      .select('last_budget_refresh')
      .limit(1)
    
    if (checkError) {
      // Column doesn't exist, let's add it
      if (checkError.message.includes("last_budget_refresh")) {
        console.log('Column does not exist. Adding last_budget_refresh column...')
        
        // Execute ALTER TABLE statement
        const { data, error } = await supabase
          .rpc('execute_sql', { 
            sql_query: 'ALTER TABLE public.meta_campaigns ADD COLUMN last_budget_refresh TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP' 
          })
        
        if (error) {
          console.error('Error adding column:', error)
          
          // Try alternative method
          const { error: rawError } = await supabase
            .from('_exec_sql')
            .insert({ 
              query: 'ALTER TABLE public.meta_campaigns ADD COLUMN last_budget_refresh TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP' 
            })
          
          if (rawError) {
            console.error('Alternative method also failed:', rawError)
            return NextResponse.json(
              { error: 'Failed to add column', details: rawError },
              { status: 500 }
            )
          }
        }
        
        return NextResponse.json({
          success: true,
          message: 'Added last_budget_refresh column to meta_campaigns table',
          timestamp: new Date().toISOString()
        })
      } else {
        console.error('Error checking if column exists:', checkError)
        return NextResponse.json(
          { error: 'Error checking if column exists', details: checkError },
          { status: 500 }
        )
      }
    } else {
      // Column already exists
      return NextResponse.json({
        success: true,
        message: 'Column last_budget_refresh already exists in meta_campaigns table',
        timestamp: new Date().toISOString()
      })
    }
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Unexpected error', details: error.message },
      { status: 500 }
    )
  }
} 