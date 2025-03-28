const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function addViewsColumn() {
  console.log('Adding views column to meta_ad_insights table...');
  
  // Create Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  try {
    // Check if views column exists
    console.log('Checking if views column exists...');
    
    // Try direct query instead of RPC
    const { data: columns, error: columnsError } = await supabase
      .from('meta_ad_insights')
      .select('views')
      .limit(1);
      
    if (columnsError) {
      if (columnsError.message.includes("column \"views\" does not exist")) {
        console.log('Views column does not exist, adding it...');
        
        // Add the column directly
        try {
          // Use REST API to add column since RPC might not be available
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/execute_sql`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
              },
              body: JSON.stringify({
                sql_query: `
                  ALTER TABLE public.meta_ad_insights 
                  ADD COLUMN views INTEGER DEFAULT 0;
                `
              })
            }
          );
          
          if (!response.ok) {
            const errorData = await response.json();
            console.error('Error adding views column:', errorData);
            console.log('Please run the SQL manually:');
            console.log('ALTER TABLE public.meta_ad_insights ADD COLUMN views INTEGER DEFAULT 0;');
          } else {
            console.log('Views column added successfully!');
          }
        } catch (apiError) {
          console.error('API error:', apiError);
          console.log('Please run the SQL manually:');
          console.log('ALTER TABLE public.meta_ad_insights ADD COLUMN views INTEGER DEFAULT 0;');
        }
      } else {
        console.error('Error checking columns:', columnsError);
      }
    } else {
      console.log('Views column already exists.');
    }
    
    // Update views from reach
    console.log('Updating views values from reach...');
    
    try {
      // Use REST API for update
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/execute_sql`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
          },
          body: JSON.stringify({
            sql_query: `
              UPDATE public.meta_ad_insights 
              SET views = reach 
              WHERE (views IS NULL OR views = 0) 
              AND reach IS NOT NULL 
              AND reach > 0;
            `
          })
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error updating views column:', errorData);
        console.log('Please run the SQL manually:');
        console.log('UPDATE public.meta_ad_insights SET views = reach WHERE (views IS NULL OR views = 0) AND reach IS NOT NULL AND reach > 0;');
      } else {
        console.log('Views values updated successfully!');
      }
    } catch (apiError) {
      console.error('API error during update:', apiError);
      console.log('Please run the SQL manually:');
      console.log('UPDATE public.meta_ad_insights SET views = reach WHERE (views IS NULL OR views = 0) AND reach IS NOT NULL AND reach > 0;');
    }
    
    console.log('Views column setup complete!');
    console.log('Next steps:');
    console.log('1. Restart your server');
    console.log('2. Resync Meta data using the admin page');
    console.log('3. Refresh your dashboard to see the Views data');
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the function
addViewsColumn(); 