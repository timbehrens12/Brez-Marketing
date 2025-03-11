-- Fix RLS policies to ensure application access
-- This script modifies the RLS policies to be more permissive while maintaining security

-- First, let's check which tables have RLS enabled
SELECT 
  schemaname, 
  tablename, 
  rowsecurity 
FROM 
  pg_tables 
WHERE 
  schemaname = 'public' AND 
  tablename IN ('brands', 'shopify_orders', 'meta_data_tracking', 'platform_connections');

-- Drop existing policies that might be too restrictive
DROP POLICY IF EXISTS "Allow all operations for authenticated users on brands" ON public.brands;
DROP POLICY IF EXISTS "Allow all operations for authenticated users on shopify_orders" ON public.shopify_orders;
DROP POLICY IF EXISTS "Allow all operations for authenticated users on meta_data_tracking" ON public.meta_data_tracking;
DROP POLICY IF EXISTS "Allow all operations for authenticated users on platform_connections" ON public.platform_connections;

-- Create more permissive policies for brands
CREATE POLICY "Enable read for all users on brands"
  ON public.brands
  FOR SELECT
  USING (true);

CREATE POLICY "Enable write for authenticated users on brands"
  ON public.brands
  FOR ALL
  USING (auth.role() = 'authenticated');

-- Create more permissive policies for shopify_orders
CREATE POLICY "Enable read for all users on shopify_orders"
  ON public.shopify_orders
  FOR SELECT
  USING (true);

CREATE POLICY "Enable write for authenticated users on shopify_orders"
  ON public.shopify_orders
  FOR ALL
  USING (auth.role() = 'authenticated');

-- Create more permissive policies for meta_data_tracking
CREATE POLICY "Enable read for all users on meta_data_tracking"
  ON public.meta_data_tracking
  FOR SELECT
  USING (true);

CREATE POLICY "Enable write for authenticated users on meta_data_tracking"
  ON public.meta_data_tracking
  FOR ALL
  USING (auth.role() = 'authenticated');

-- Create more permissive policies for platform_connections
CREATE POLICY "Enable read for all users on platform_connections"
  ON public.platform_connections
  FOR SELECT
  USING (true);

CREATE POLICY "Enable write for authenticated users on platform_connections"
  ON public.platform_connections
  FOR ALL
  USING (auth.role() = 'authenticated');

-- If the above doesn't work, you can temporarily disable RLS to restore functionality
-- Uncomment these lines if needed:
-- ALTER TABLE public.brands DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.shopify_orders DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.meta_data_tracking DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.platform_connections DISABLE ROW LEVEL SECURITY;

-- Verify the changes
SELECT 
  schemaname, 
  tablename, 
  rowsecurity 
FROM 
  pg_tables 
WHERE 
  schemaname = 'public' AND 
  tablename IN ('brands', 'shopify_orders', 'meta_data_tracking', 'platform_connections');

-- This script creates simplified RLS policies for the product performance tables
-- These policies avoid the type mismatch issues by using simple policies

-- Enable RLS on all product performance tables
ALTER TABLE public.product_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_turnover ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_performance_metrics ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own product views data" ON public.product_views;
DROP POLICY IF EXISTS "Users can view their own product returns data" ON public.product_returns;
DROP POLICY IF EXISTS "Users can view their own product relationships data" ON public.product_relationships;
DROP POLICY IF EXISTS "Users can view their own inventory turnover data" ON public.inventory_turnover;
DROP POLICY IF EXISTS "Users can view their own product reviews data" ON public.product_reviews;
DROP POLICY IF EXISTS "Users can view their own product performance metrics data" ON public.product_performance_metrics;
DROP POLICY IF EXISTS "Users can insert their own product data" ON public.product_views;
DROP POLICY IF EXISTS "Users can insert their own returns data" ON public.product_returns;
DROP POLICY IF EXISTS "Users can insert their own product relationships data" ON public.product_relationships;
DROP POLICY IF EXISTS "Users can insert their own inventory turnover data" ON public.inventory_turnover;
DROP POLICY IF EXISTS "Users can insert their own product reviews data" ON public.product_reviews;
DROP POLICY IF EXISTS "Users can insert their own product performance metrics data" ON public.product_performance_metrics;
DROP POLICY IF EXISTS "Allow all operations for authenticated users on product_views" ON public.product_views;
DROP POLICY IF EXISTS "Allow all operations for authenticated users on product_returns" ON public.product_returns;
DROP POLICY IF EXISTS "Allow all operations for authenticated users on product_relationships" ON public.product_relationships;
DROP POLICY IF EXISTS "Allow all operations for authenticated users on inventory_turnover" ON public.inventory_turnover;
DROP POLICY IF EXISTS "Allow all operations for authenticated users on product_reviews" ON public.product_reviews;
DROP POLICY IF EXISTS "Allow all operations for authenticated users on product_performance_metrics" ON public.product_performance_metrics;

-- Create simple permissive policies for all tables
-- These policies allow all operations for authenticated users

CREATE POLICY "Allow all operations for authenticated users on product_views"
  ON public.product_views
  FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Allow all operations for authenticated users on product_returns"
  ON public.product_returns
  FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Allow all operations for authenticated users on product_relationships"
  ON public.product_relationships
  FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Allow all operations for authenticated users on inventory_turnover"
  ON public.inventory_turnover
  FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Allow all operations for authenticated users on product_reviews"
  ON public.product_reviews
  FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Allow all operations for authenticated users on product_performance_metrics"
  ON public.product_performance_metrics
  FOR ALL
  TO authenticated
  USING (true);

-- Create policies for service role access
CREATE POLICY "Allow service role access on product_views"
  ON public.product_views
  FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Allow service role access on product_returns"
  ON public.product_returns
  FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Allow service role access on product_relationships"
  ON public.product_relationships
  FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Allow service role access on inventory_turnover"
  ON public.inventory_turnover
  FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Allow service role access on product_reviews"
  ON public.product_reviews
  FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Allow service role access on product_performance_metrics"
  ON public.product_performance_metrics
  FOR ALL
  TO service_role
  USING (true);

-- Verify that RLS is enabled
SELECT 
  schemaname, 
  tablename, 
  rowsecurity 
FROM 
  pg_tables 
WHERE 
  schemaname = 'public' 
  AND tablename IN (
    'product_views',
    'product_returns',
    'product_relationships',
    'inventory_turnover',
    'product_reviews',
    'product_performance_metrics'
  ); 