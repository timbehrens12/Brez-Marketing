-- Extract location data from existing Shopify orders and populate the shopify_sales_by_region table
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

-- Now extract and insert data from shopify_orders
-- First, get the connection and brand information
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
  so.connection_id::text,
  ci.brand_id::text,
  ci.user_id::text,
  so.id::text,
  so.created_at,
  -- Extract location data from line_items JSON if available
  COALESCE(
    (so.line_items->0->'shipping_address'->>'city'),
    'Unknown'
  ) as city,
  COALESCE(
    (so.line_items->0->'shipping_address'->>'province'),
    'Unknown'
  ) as province,
  COALESCE(
    (so.line_items->0->'shipping_address'->>'province_code'),
    'Unknown'
  ) as province_code,
  COALESCE(
    (so.line_items->0->'shipping_address'->>'country'),
    'Unknown'
  ) as country,
  COALESCE(
    (so.line_items->0->'shipping_address'->>'country_code'),
    'Unknown'
  ) as country_code,
  so.total_price,
  1 as order_count
FROM 
  shopify_orders so,
  connection_info ci
WHERE 
  so.connection_id = ci.connection_id
  AND so.line_items IS NOT NULL
  AND (so.line_items->0->'shipping_address'->>'city') IS NOT NULL
ON CONFLICT (connection_id, order_id) 
DO UPDATE SET
  city = EXCLUDED.city,
  province = EXCLUDED.province,
  province_code = EXCLUDED.province_code,
  country = EXCLUDED.country,
  country_code = EXCLUDED.country_code,
  total_price = EXCLUDED.total_price;

-- If there's no location data in the orders, insert some placeholder data
-- for testing purposes
DO $$
DECLARE
  connection_record RECORD;
  count_regions INTEGER;
BEGIN
  -- Check if we have any regions
  SELECT COUNT(*) INTO count_regions FROM shopify_sales_by_region;
  
  IF count_regions = 0 THEN
    -- Get a connection to use for placeholder data
    SELECT pc.id, pc.brand_id, pc.user_id INTO connection_record
    FROM platform_connections pc
    WHERE pc.platform_type = 'shopify'
    AND pc.status = 'active'
    LIMIT 1;
    
    IF connection_record IS NOT NULL THEN
      -- Insert placeholder data for major cities
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
        (connection_record.id::text, connection_record.brand_id::text, connection_record.user_id::text, 'placeholder-1', NOW(), 'New York', 'New York', 'NY', 'United States', 'US', 1250.00, 5),
        (connection_record.id::text, connection_record.brand_id::text, connection_record.user_id::text, 'placeholder-2', NOW(), 'Los Angeles', 'California', 'CA', 'United States', 'US', 980.50, 4),
        (connection_record.id::text, connection_record.brand_id::text, connection_record.user_id::text, 'placeholder-3', NOW(), 'Chicago', 'Illinois', 'IL', 'United States', 'US', 750.25, 3),
        (connection_record.id::text, connection_record.brand_id::text, connection_record.user_id::text, 'placeholder-4', NOW(), 'Houston', 'Texas', 'TX', 'United States', 'US', 500.75, 2),
        (connection_record.id::text, connection_record.brand_id::text, connection_record.user_id::text, 'placeholder-5', NOW(), 'Toronto', 'Ontario', 'ON', 'Canada', 'CA', 450.00, 2);
    END IF;
  END IF;
END $$; 