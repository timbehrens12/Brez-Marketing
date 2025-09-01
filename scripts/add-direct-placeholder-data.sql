-- Simple script to directly add placeholder region data for testing
-- This script can be run directly in the Supabase SQL Editor

-- First, check if the shopify_sales_by_region table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'shopify_sales_by_region'
  ) THEN
    -- Create the table if it doesn't exist
    CREATE TABLE shopify_sales_by_region (
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
      user_id TEXT,
      UNIQUE(connection_id, order_id)
    );

    -- Add indexes for faster queries
    CREATE INDEX IF NOT EXISTS idx_sales_by_region_brand_id ON shopify_sales_by_region(brand_id);
    CREATE INDEX IF NOT EXISTS idx_sales_by_region_connection_id ON shopify_sales_by_region(connection_id);
    CREATE INDEX IF NOT EXISTS idx_sales_by_region_city ON shopify_sales_by_region(city);
    CREATE INDEX IF NOT EXISTS idx_sales_by_region_country ON shopify_sales_by_region(country);
    CREATE INDEX IF NOT EXISTS idx_sales_by_region_created_at ON shopify_sales_by_region(created_at);
    CREATE INDEX IF NOT EXISTS idx_sales_by_region_user_id ON shopify_sales_by_region(user_id);

    -- Add RLS policies
    ALTER TABLE shopify_sales_by_region ENABLE ROW LEVEL SECURITY;

    -- Simple policy to allow users to select their own data
    CREATE POLICY select_own_sales_by_region ON shopify_sales_by_region
      FOR SELECT USING (user_id = auth.uid()::text);

    -- Simple policy to allow users to insert their own data
    CREATE POLICY insert_own_sales_by_region ON shopify_sales_by_region
      FOR INSERT WITH CHECK (user_id = auth.uid()::text);

    -- Simple policy to allow users to update their own data
    CREATE POLICY update_own_sales_by_region ON shopify_sales_by_region
      FOR UPDATE USING (user_id = auth.uid()::text);

    -- Simple policy to allow users to delete their own data
    CREATE POLICY delete_own_sales_by_region ON shopify_sales_by_region
      FOR DELETE USING (user_id = auth.uid()::text);
  END IF;
END $$;

-- IMPORTANT: Replace these values with your actual values
-- You can find these values in your Supabase database
-- or in the browser console logs
-- 
-- Example:
-- brand_id: '1a30f34b-b048-4f80-b880-6c61bd12c720'
-- connection_id: '9d7a2d0c-4312-4f81-ab63-c9096f74f617'
-- user_id: 'user_2tHp6PPuKFIUImeafbZ8JeIAIVK'

-- Direct insert of placeholder data with hardcoded values
INSERT INTO shopify_sales_by_region (
  connection_id,
  brand_id,
  user_id,
  order_id,
  created_at,
  city,
  province,
  province_code,
  country,
  country_code,
  total_price,
  order_count
)
VALUES
  -- Replace these values with your actual values
  ('9d7a2d0c-4312-4f81-ab63-c9096f74f617', '1a30f34b-b048-4f80-b880-6c61bd12c720', 'user_2tHp6PPuKFIUImeafbZ8JeIAIVK', 'direct-placeholder-1', NOW(), 'New York', 'New York', 'NY', 'United States', 'US', 1250.00, 5),
  ('9d7a2d0c-4312-4f81-ab63-c9096f74f617', '1a30f34b-b048-4f80-b880-6c61bd12c720', 'user_2tHp6PPuKFIUImeafbZ8JeIAIVK', 'direct-placeholder-2', NOW(), 'Los Angeles', 'California', 'CA', 'United States', 'US', 980.50, 4),
  ('9d7a2d0c-4312-4f81-ab63-c9096f74f617', '1a30f34b-b048-4f80-b880-6c61bd12c720', 'user_2tHp6PPuKFIUImeafbZ8JeIAIVK', 'direct-placeholder-3', NOW(), 'Chicago', 'Illinois', 'IL', 'United States', 'US', 750.25, 3),
  ('9d7a2d0c-4312-4f81-ab63-c9096f74f617', '1a30f34b-b048-4f80-b880-6c61bd12c720', 'user_2tHp6PPuKFIUImeafbZ8JeIAIVK', 'direct-placeholder-4', NOW(), 'Houston', 'Texas', 'TX', 'United States', 'US', 500.75, 2),
  ('9d7a2d0c-4312-4f81-ab63-c9096f74f617', '1a30f34b-b048-4f80-b880-6c61bd12c720', 'user_2tHp6PPuKFIUImeafbZ8JeIAIVK', 'direct-placeholder-5', NOW(), 'Toronto', 'Ontario', 'ON', 'Canada', 'CA', 450.00, 2)
ON CONFLICT (connection_id, order_id) DO NOTHING; 