-- Drop the table if it exists
DROP TABLE IF EXISTS shopify_sales_by_region CASCADE;

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
  user_id UUID, -- Add user_id column for direct RLS
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
  FOR SELECT USING (user_id = auth.uid());

-- Simple policy to allow users to insert their own data
CREATE POLICY insert_own_sales_by_region ON shopify_sales_by_region
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Simple policy to allow users to update their own data
CREATE POLICY update_own_sales_by_region ON shopify_sales_by_region
  FOR UPDATE USING (user_id = auth.uid());

-- Simple policy to allow users to delete their own data
CREATE POLICY delete_own_sales_by_region ON shopify_sales_by_region
  FOR DELETE USING (user_id = auth.uid()); 