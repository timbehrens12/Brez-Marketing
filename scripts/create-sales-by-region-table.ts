import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

async function createSalesByRegionTable() {
  console.log('Creating sales by region table...')
  
  try {
    // Drop the table if it exists
    const { error: dropError } = await supabase.rpc('execute_sql', {
      sql_query: `
        DROP TABLE IF EXISTS shopify_sales_by_region CASCADE;
      `
    })
    
    if (dropError) {
      console.error('Error dropping table:', dropError)
      // Continue anyway
    } else {
      console.log('Dropped existing table (if any)')
    }
    
    // Create the table
    const { error: createError } = await supabase.rpc('execute_sql', {
      sql_query: `
        -- Create a table to store sales by region data
        CREATE TABLE IF NOT EXISTS shopify_sales_by_region (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          brand_id TEXT NOT NULL,
          connection_id TEXT NOT NULL,
          order_id TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL,
          city TEXT,
          province TEXT,
          province_code TEXT,
          country TEXT,
          country_code TEXT,
          total_price DECIMAL(10, 2) NOT NULL,
          order_count INTEGER DEFAULT 1,
          UNIQUE(connection_id, order_id)
        );
        
        -- Add indexes for faster queries
        CREATE INDEX IF NOT EXISTS idx_sales_by_region_brand_id ON shopify_sales_by_region(brand_id);
        CREATE INDEX IF NOT EXISTS idx_sales_by_region_connection_id ON shopify_sales_by_region(connection_id);
        CREATE INDEX IF NOT EXISTS idx_sales_by_region_city ON shopify_sales_by_region(city);
        CREATE INDEX IF NOT EXISTS idx_sales_by_region_country ON shopify_sales_by_region(country);
        CREATE INDEX IF NOT EXISTS idx_sales_by_region_created_at ON shopify_sales_by_region(created_at);
        
        -- Add RLS policies
        ALTER TABLE shopify_sales_by_region ENABLE ROW LEVEL SECURITY;
        
        -- Policy to allow users to select their own data
        CREATE POLICY select_own_sales_by_region ON shopify_sales_by_region
          FOR SELECT USING (
            brand_id IN (
              SELECT id::text FROM brands WHERE user_id = auth.uid()
            )
          );
        
        -- Policy to allow users to insert their own data
        CREATE POLICY insert_own_sales_by_region ON shopify_sales_by_region
          FOR INSERT WITH CHECK (
            brand_id IN (
              SELECT id::text FROM brands WHERE user_id = auth.uid()
            )
          );
        
        -- Policy to allow users to update their own data
        CREATE POLICY update_own_sales_by_region ON shopify_sales_by_region
          FOR UPDATE USING (
            brand_id IN (
              SELECT id::text FROM brands WHERE user_id = auth.uid()
            )
          );
        
        -- Policy to allow users to delete their own data
        CREATE POLICY delete_own_sales_by_region ON shopify_sales_by_region
          FOR DELETE USING (
            brand_id IN (
              SELECT id::text FROM brands WHERE user_id = auth.uid()
            )
          );
      `
    })
    
    if (createError) {
      console.error('Error creating table:', createError)
      throw createError
    }
    
    console.log('Successfully created shopify_sales_by_region table')
  } catch (error) {
    console.error('Error creating table:', error)
  }
}

// Run the function
createSalesByRegionTable()
  .then(() => {
    console.log('Script completed')
    process.exit(0)
  })
  .catch(error => {
    console.error('Script failed:', error)
    process.exit(1)
  }) 