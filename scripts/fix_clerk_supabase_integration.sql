-- Fix Clerk-Supabase Integration for Row Level Security
-- This script creates policies that work with Clerk authentication

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
DROP POLICY IF EXISTS "Enable read for all users on brands" ON public.brands;
DROP POLICY IF EXISTS "Enable write for authenticated users on brands" ON public.brands;
DROP POLICY IF EXISTS "Enable read for all users on shopify_orders" ON public.shopify_orders;
DROP POLICY IF EXISTS "Enable write for authenticated users on shopify_orders" ON public.shopify_orders;
DROP POLICY IF EXISTS "Enable read for all users on meta_data_tracking" ON public.meta_data_tracking;
DROP POLICY IF EXISTS "Enable write for authenticated users on meta_data_tracking" ON public.meta_data_tracking;
DROP POLICY IF EXISTS "Enable read for all users on platform_connections" ON public.platform_connections;
DROP POLICY IF EXISTS "Enable write for authenticated users on platform_connections" ON public.platform_connections;

-- Create special policies for Clerk integration
-- These policies allow access when:
-- 1. The request is from a service role (for server-side operations)
-- 2. The request has a valid JWT (for client-side operations)
-- 3. The request is from an anonymous user (for public access)

-- Brands table policies
CREATE POLICY "Allow service role access on brands"
  ON public.brands
  USING (auth.jwt() IS NULL);

CREATE POLICY "Allow authenticated access on brands"
  ON public.brands
  USING (auth.role() = 'authenticated');

-- Shopify orders table policies
CREATE POLICY "Allow service role access on shopify_orders"
  ON public.shopify_orders
  USING (auth.jwt() IS NULL);

CREATE POLICY "Allow authenticated access on shopify_orders"
  ON public.shopify_orders
  USING (auth.role() = 'authenticated');

-- Meta data tracking table policies
CREATE POLICY "Allow service role access on meta_data_tracking"
  ON public.meta_data_tracking
  USING (auth.jwt() IS NULL);

CREATE POLICY "Allow authenticated access on meta_data_tracking"
  ON public.meta_data_tracking
  USING (auth.role() = 'authenticated');

-- Platform connections table policies
CREATE POLICY "Allow service role access on platform_connections"
  ON public.platform_connections
  USING (auth.jwt() IS NULL);

CREATE POLICY "Allow authenticated access on platform_connections"
  ON public.platform_connections
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