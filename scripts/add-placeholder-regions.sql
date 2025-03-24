-- Simple script to add placeholder region data for testing
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

-- Get connection info
WITH connection_info AS (
  SELECT 
    pc.id as connection_id,
    pc.brand_id,
    pc.user_id
  FROM 
    platform_connections pc
  WHERE 
    pc.platform_type = 'shopify'
    AND pc.status = 'active'
  LIMIT 1
)
-- Add placeholder data
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
SELECT
  ci.connection_id::text,
  ci.brand_id::text,
  ci.user_id::text,
  'placeholder-' || n,
  NOW() - (n || ' days')::interval,
  city,
  province,
  province_code,
  country,
  country_code,
  (1500 - (n * 100))::numeric(10,2),
  6 - n
FROM
  connection_info ci,
  (VALUES
    (1, 'New York', 'New York', 'NY', 'United States', 'US'),
    (2, 'Los Angeles', 'California', 'CA', 'United States', 'US'),
    (3, 'Chicago', 'Illinois', 'IL', 'United States', 'US'),
    (4, 'Houston', 'Texas', 'TX', 'United States', 'US'),
    (5, 'Toronto', 'Ontario', 'ON', 'Canada', 'CA')
  ) AS cities(n, city, province, province_code, country, country_code)
ON CONFLICT (connection_id, order_id) DO NOTHING; 