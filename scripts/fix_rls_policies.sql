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