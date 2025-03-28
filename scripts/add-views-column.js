import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

async function addViewsColumn() {
  console.log('Adding views column to meta_ad_insights table...')
  
  // Create Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  
  try {
    // Check if column exists
    const { data: columnExists, error: checkError } = await supabase.rpc(
      'execute_sql',
      {
        sql_query: `
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'meta_ad_insights' 
            AND column_name = 'views'
          );
        `
      }
    )
    
    if (checkError) {
      console.error('Error checking if column exists:', checkError)
      process.exit(1)
    }
    
    // If column doesn't exist, add it
    if (!columnExists || !columnExists[0] || !columnExists[0].exists) {
      console.log('Views column does not exist, adding it...')
      
      const { error: addError } = await supabase.rpc(
        'execute_sql',
        {
          sql_query: `
            ALTER TABLE public.meta_ad_insights 
            ADD COLUMN views INTEGER DEFAULT 0;
          `
        }
      )
      
      if (addError) {
        console.error('Error adding views column:', addError)
        process.exit(1)
      }
      
      console.log('Views column added successfully!')
    } else {
      console.log('Views column already exists.')
    }
    
    // Update views from reach
    console.log('Updating views values from reach...')
    
    const { error: updateError } = await supabase.rpc(
      'execute_sql',
      {
        sql_query: `
          UPDATE public.meta_ad_insights 
          SET views = reach 
          WHERE (views IS NULL OR views = 0) 
          AND reach IS NOT NULL 
          AND reach > 0;
        `
      }
    )
    
    if (updateError) {
      console.error('Error updating views column:', updateError)
      process.exit(1)
    }
    
    console.log('Views column updated successfully!')
    
    // Count updated rows
    const { data: countData, error: countError } = await supabase.rpc(
      'execute_sql',
      {
        sql_query: `
          SELECT COUNT(*) 
          FROM public.meta_ad_insights 
          WHERE views > 0;
        `
      }
    )
    
    if (countError) {
      console.error('Error counting updated rows:', countError)
    } else {
      console.log(`${countData && countData[0] ? countData[0].count : 0} rows have views data.`)
    }
    
    console.log('Done!')
  } catch (error) {
    console.error('Unexpected error:', error)
    process.exit(1)
  }
}

// Run the function
addViewsColumn() 