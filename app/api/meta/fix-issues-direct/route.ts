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

    // Track operations
    const operations = [];

    // Add the last_budget_refresh column
    console.log('Checking if last_budget_refresh column exists...');
    try {
      const { data: columnCheck, error: checkError } = await supabase
        .from('meta_campaigns')
        .select('last_budget_refresh')
        .limit(1);
      
      if (checkError) {
        // Column doesn't exist, add it
        if (checkError.message.includes('last_budget_refresh')) {
          console.log('Adding missing last_budget_refresh column...');
          
          // Simpler direct query approach
          const { data, error } = await supabase.rpc('execute_sql', { 
            sql_query: 'ALTER TABLE public.meta_campaigns ADD COLUMN last_budget_refresh TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP' 
          });
          
          if (error) {
            console.error('Error adding column:', error);
            operations.push({
              operation: 'add_column',
              success: false,
              error: error.message
            });
          } else {
            console.log('Successfully added last_budget_refresh column');
            operations.push({
              operation: 'add_column',
              success: true
            });
          }
        } else {
          // Other error
          console.error('Error checking column:', checkError);
          operations.push({
            operation: 'check_column',
            success: false,
            error: checkError.message
          });
        }
      } else {
        // Column already exists
        console.log('Column last_budget_refresh already exists');
        operations.push({
          operation: 'check_column',
          success: true,
          message: 'Column already exists'
        });
      }
    } catch (err) {
      console.error('Exception during column check/add:', err);
      operations.push({
        operation: 'column_operation',
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      });
    }

    // 2. Check for the adset insights function
    console.log('Checking for get_adset_insights_by_date_range function...');
    try {
      // Test if function exists
      const { data: functionTest, error: testError } = await supabase.rpc(
        'get_adset_insights_by_date_range',
        {
          brand_uuid: '00000000-0000-0000-0000-000000000000',
          p_from_date: '2023-01-01',
          p_to_date: '2023-01-02'
        }
      );
      
      if (testError) {
        if (testError.message.includes('could not find function') || 
            testError.message.includes('not found in the schema cache')) {
          console.log('Function does not exist, needs to be created');
          operations.push({
            operation: 'check_function',
            success: false,
            error: 'Function does not exist',
            message: 'Please run the SQL script scripts/meta/fix/create_missing_adset_insights_function.sql manually'
          });
        } else {
          // Function exists but returned a different error
          console.log('Function exists but returned error:', testError);
          operations.push({
            operation: 'check_function',
            success: true,
            message: 'Function exists but returned error: ' + testError.message
          });
        }
      } else {
        // Function exists and works
        console.log('Function get_adset_insights_by_date_range exists and works');
        operations.push({
          operation: 'check_function',
          success: true,
          message: 'Function exists'
        });
      }
    } catch (err) {
      console.error('Exception checking function:', err);
      operations.push({
        operation: 'function_check',
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      });
    }

    // Return operations results
    return NextResponse.json({
      operations,
      message: 'Database checks completed',
      timestamp: new Date().toISOString()
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