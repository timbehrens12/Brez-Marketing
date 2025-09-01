-- Fix Analytics Tables and Data Population
-- This script creates missing tables and populates them with data from existing orders

-- 1. Create shopify_customer_segments table (missing table that APIs are looking for)
CREATE TABLE IF NOT EXISTS shopify_customer_segments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id TEXT NOT NULL,
  user_id TEXT,
  connection_id TEXT NOT NULL,
  segment_name TEXT NOT NULL,
  segment_type TEXT NOT NULL DEFAULT 'location',
  country TEXT,
  province TEXT,
  city TEXT,
  customer_count INTEGER DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  total_revenue DECIMAL(10, 2) DEFAULT 0,
  average_order_value DECIMAL(10, 2) DEFAULT 0,
  clv_tier TEXT DEFAULT 'low',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint to prevent duplicates
  UNIQUE(brand_id, segment_name, segment_type)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_shopify_customer_segments_brand_id ON shopify_customer_segments(brand_id);
CREATE INDEX IF NOT EXISTS idx_shopify_customer_segments_connection_id ON shopify_customer_segments(connection_id);
CREATE INDEX IF NOT EXISTS idx_shopify_customer_segments_country ON shopify_customer_segments(country);
CREATE INDEX IF NOT EXISTS idx_shopify_customer_segments_clv_tier ON shopify_customer_segments(clv_tier);
CREATE INDEX IF NOT EXISTS idx_shopify_customer_segments_total_revenue ON shopify_customer_segments(total_revenue);

-- Add RLS policies
ALTER TABLE shopify_customer_segments ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to select their own data
CREATE POLICY select_own_customer_segments ON shopify_customer_segments
  FOR SELECT USING (
    brand_id IN (
      SELECT id::text FROM brands WHERE user_id = auth.uid()
    )
  );

-- Policy to allow users to insert their own data
CREATE POLICY insert_own_customer_segments ON shopify_customer_segments
  FOR INSERT WITH CHECK (
    brand_id IN (
      SELECT id::text FROM brands WHERE user_id = auth.uid()
    )
  );

-- Policy to allow users to update their own data
CREATE POLICY update_own_customer_segments ON shopify_customer_segments
  FOR UPDATE USING (
    brand_id IN (
      SELECT id::text FROM brands WHERE user_id = auth.uid()
    )
  );

-- Policy to allow users to delete their own data
CREATE POLICY delete_own_customer_segments ON shopify_customer_segments
  FOR DELETE USING (
    brand_id IN (
      SELECT id::text FROM brands WHERE user_id = auth.uid()
    )
  );

-- 2. Populate customer segments from existing shopify_sales_by_region data
INSERT INTO shopify_customer_segments (
  brand_id,
  user_id,
  connection_id,
  segment_name,
  segment_type,
  country,
  province,
  city,
  customer_count,
  total_orders,
  total_revenue,
  average_order_value,
  clv_tier
)
SELECT 
  brand_id,
  user_id,
  connection_id,
  CONCAT(
    COALESCE(city, 'Unknown'), ', ',
    COALESCE(province, 'Unknown'), ', ',
    COALESCE(country, 'Unknown')
  ) as segment_name,
  'location' as segment_type,
  country,
  province,
  city,
  COUNT(DISTINCT order_id) as customer_count, -- Approximation
  COUNT(*) as total_orders,
  SUM(total_price) as total_revenue,
  AVG(total_price) as average_order_value,
  CASE 
    WHEN SUM(total_price) >= 10000 THEN 'high'
    WHEN SUM(total_price) >= 2000 THEN 'medium'
    ELSE 'low'
  END as clv_tier
FROM shopify_sales_by_region
WHERE city IS NOT NULL AND country IS NOT NULL
GROUP BY brand_id, user_id, connection_id, country, province, city
ON CONFLICT (brand_id, segment_name, segment_type) 
DO UPDATE SET
  customer_count = EXCLUDED.customer_count,
  total_orders = EXCLUDED.total_orders,
  total_revenue = EXCLUDED.total_revenue,
  average_order_value = EXCLUDED.average_order_value,
  clv_tier = EXCLUDED.clv_tier,
  updated_at = NOW();

-- 3. Add missing user_id column to shopify_sales_by_region if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shopify_sales_by_region' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE shopify_sales_by_region ADD COLUMN user_id TEXT;
    CREATE INDEX IF NOT EXISTS idx_sales_by_region_user_id ON shopify_sales_by_region(user_id);
  END IF;
END $$;

-- 4. Populate missing user_id data in shopify_sales_by_region from platform_connections
UPDATE shopify_sales_by_region 
SET user_id = pc.user_id::text
FROM platform_connections pc
WHERE shopify_sales_by_region.connection_id = pc.id::text
AND shopify_sales_by_region.user_id IS NULL;

-- 5. Check and display current data counts
SELECT 
  'Data Summary:' as summary,
  (SELECT COUNT(*) FROM shopify_orders) as total_orders,
  (SELECT COUNT(*) FROM shopify_sales_by_region) as regional_sales_records,
  (SELECT COUNT(*) FROM shopify_customer_segments) as customer_segments,
  (SELECT COUNT(DISTINCT country) FROM shopify_sales_by_region WHERE country IS NOT NULL) as unique_countries,
  (SELECT COUNT(DISTINCT city) FROM shopify_sales_by_region WHERE city IS NOT NULL) as unique_cities;
