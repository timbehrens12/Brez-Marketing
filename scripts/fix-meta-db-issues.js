// Fix Meta DB Issues Script
// This script helps fix common database issues with the Meta tables

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Define the Supabase connection
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Check if environment variables are defined
if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing Supabase environment variables');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are defined');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function addLastBudgetRefreshColumn() {
  console.log('Checking if last_budget_refresh column exists...');
  
  try {
    // First check if the column already exists
    const { data: columnExists, error: checkError } = await supabase
      .from('meta_campaigns')
      .select('last_budget_refresh')
      .limit(1);
    
    if (checkError) {
      // Column doesn't exist, let's add it
      if (checkError.message.includes('last_budget_refresh')) {
        console.log('Column does not exist. Adding last_budget_refresh column...');
        
        try {
          // Try using raw SQL query through rpc
          const { error } = await supabase.rpc('execute_sql', {
            sql_query: 'ALTER TABLE public.meta_campaigns ADD COLUMN last_budget_refresh TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP'
          });
          
          if (error) {
            throw new Error(`RPC execute_sql failed: ${error.message}`);
          }
          
          console.log('✅ Successfully added last_budget_refresh column to meta_campaigns table');
          return true;
        } catch (rpcError) {
          console.error('Error adding column using RPC:', rpcError);
          console.log('Trying an alternative method...');
          
          // Try direct query if possible
          try {
            // This is a fallback, may not work depending on permissions
            const { error: directError } = await supabase.from('_exec_sql').insert({
              query: 'ALTER TABLE public.meta_campaigns ADD COLUMN last_budget_refresh TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP'
            });
            
            if (directError) {
              throw new Error(`Direct SQL execution failed: ${directError.message}`);
            }
            
            console.log('✅ Successfully added last_budget_refresh column using direct query');
            return true;
          } catch (directError) {
            console.error('All methods to add the column failed:', directError);
            console.log('Please run this SQL query manually in the Supabase dashboard:');
            console.log('ALTER TABLE public.meta_campaigns ADD COLUMN last_budget_refresh TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;');
            return false;
          }
        }
      } else {
        // Some other error occurred
        console.error('Error checking column existence:', checkError);
        return false;
      }
    } else {
      console.log('✅ Column last_budget_refresh already exists in meta_campaigns table');
      return true;
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    return false;
  }
}

async function main() {
  console.log('Starting Meta DB Fixes...');
  
  // Fix 1: Add missing last_budget_refresh column
  await addLastBudgetRefreshColumn();
  
  console.log('Script completed');
}

main().catch(error => {
  console.error('Script failed with error:', error);
  process.exit(1);
}); 