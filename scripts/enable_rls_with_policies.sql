-- Enable RLS and set up proper policies
-- This script enables RLS on all tables and creates policies that work with the application

-- First, enable RLS on all tables
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopify_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_data_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_connections ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow all operations for authenticated users on brands" ON public.brands;
DROP POLICY IF EXISTS "Allow all operations for authenticated users on shopify_orders" ON public.shopify_orders;
DROP POLICY IF EXISTS "Allow all operations for authenticated users on meta_data_tracking" ON public.meta_data_tracking;
DROP POLICY IF EXISTS "Allow all operations for authenticated users on platform_connections" ON public.platform_connections;
DROP POLICY IF EXISTS "Enable read for all users on brands" ON public.brands;
DROP POLICY IF EXISTS "Enable write for authenticated users on brands" ON public.brands;
DROP POLICY IF EXISTS "Enable read for all users on shopify_orders" ON public.shopify_orders;
DROP POLICY IF EXISTS "Enable write for authenticated users on shopify_orders" ON public.shopify_orders;
DROP POLICY IF EXISTS "Enable read for all users on meta_data_tracking" ON public.meta_data_tracking;
DROP POLICY IF EXISTS "Enable write for authenticated users on meta_data_tracking" ON public.meta_data_tracking;
DROP POLICY IF EXISTS "Enable read for all users on platform_connections" ON public.platform_connections;
DROP POLICY IF EXISTS "Enable write for authenticated users on platform_connections" ON public.platform_connections;
DROP POLICY IF EXISTS "Allow service role access on brands" ON public.brands;
DROP POLICY IF EXISTS "Allow authenticated access on brands" ON public.brands;
DROP POLICY IF EXISTS "Allow service role access on shopify_orders" ON public.shopify_orders;
DROP POLICY IF EXISTS "Allow authenticated access on shopify_orders" ON public.shopify_orders;
DROP POLICY IF EXISTS "Allow service role access on meta_data_tracking" ON public.meta_data_tracking;
DROP POLICY IF EXISTS "Allow authenticated access on meta_data_tracking" ON public.meta_data_tracking;
DROP POLICY IF EXISTS "Allow service role access on platform_connections" ON public.platform_connections;
DROP POLICY IF EXISTS "Allow authenticated access on platform_connections" ON public.platform_connections;

-- Create permissive policies for all tables
-- These policies allow both authenticated users and service roles to access the data

-- Brands table policies
CREATE POLICY "Allow full access to brands"
  ON public.brands
  FOR ALL
  USING (true);

-- Shopify orders table policies
CREATE POLICY "Allow full access to shopify_orders"
  ON public.shopify_orders
  FOR ALL
  USING (true);

-- Meta data tracking table policies
CREATE POLICY "Allow full access to meta_data_tracking"
  ON public.meta_data_tracking
  FOR ALL
  USING (true);

-- Platform connections table policies
CREATE POLICY "Allow full access to platform_connections"
  ON public.platform_connections
  FOR ALL
  USING (true);

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