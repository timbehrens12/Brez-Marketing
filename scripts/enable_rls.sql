-- Enable Row Level Security (RLS) on public tables
-- This script addresses the "RLS Disabled in Public" errors

-- 1. Enable RLS on brands table
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

-- Create policy for brands table
CREATE POLICY "Allow all operations for authenticated users on brands"
  ON public.brands
  USING (auth.role() = 'authenticated');

-- 2. Enable RLS on shopify_orders table
ALTER TABLE public.shopify_orders ENABLE ROW LEVEL SECURITY;

-- Create policy for shopify_orders table
CREATE POLICY "Allow all operations for authenticated users on shopify_orders"
  ON public.shopify_orders
  USING (auth.role() = 'authenticated');

-- 3. Enable RLS on meta_data_tracking table
ALTER TABLE public.meta_data_tracking ENABLE ROW LEVEL SECURITY;

-- Create policy for meta_data_tracking table
CREATE POLICY "Allow all operations for authenticated users on meta_data_tracking"
  ON public.meta_data_tracking
  USING (auth.role() = 'authenticated');

-- 4. Enable RLS on platform_connections table
ALTER TABLE public.platform_connections ENABLE ROW LEVEL SECURITY;

-- Create policy for platform_connections table
CREATE POLICY "Allow all operations for authenticated users on platform_connections"
  ON public.platform_connections
  USING (auth.role() = 'authenticated');

-- Optional: Create fallback policies if needed
-- These policies are more permissive and should only be used if the above policies
-- cause issues with your application

-- CREATE POLICY "Allow all operations on brands"
--   ON public.brands
--   FOR ALL
--   USING (true);

-- CREATE POLICY "Allow all operations on shopify_orders"
--   ON public.shopify_orders
--   FOR ALL
--   USING (true);

-- CREATE POLICY "Allow all operations on meta_data_tracking"
--   ON public.meta_data_tracking
--   FOR ALL
--   USING (true);

-- CREATE POLICY "Allow all operations on platform_connections"
--   ON public.platform_connections
--   FOR ALL
--   USING (true);

-- Verify RLS is enabled
SELECT 
  schemaname, 
  tablename, 
  rowsecurity 
FROM 
  pg_tables 
WHERE 
  schemaname = 'public' AND 
  tablename IN ('brands', 'shopify_orders', 'meta_data_tracking', 'platform_connections'); 