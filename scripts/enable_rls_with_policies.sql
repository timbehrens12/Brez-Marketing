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

-- This script enables Row Level Security (RLS) on product performance tables
-- and creates policies to control access to the data

-- Enable RLS on all product performance tables
ALTER TABLE product_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_turnover ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS product_performance_metrics_policy ON product_performance_metrics;
DROP POLICY IF EXISTS product_relationships_policy ON product_relationships;
DROP POLICY IF EXISTS product_reviews_policy ON product_reviews;
DROP POLICY IF EXISTS product_views_policy ON product_views;
DROP POLICY IF EXISTS product_returns_policy ON product_returns;
DROP POLICY IF EXISTS inventory_turnover_policy ON inventory_turnover;

-- Create policies for read access
-- These policies allow users to read data for brands they have access to
CREATE POLICY product_performance_metrics_select_policy ON product_performance_metrics
    FOR SELECT
    TO authenticated
    USING (
        brand_id IN (
            SELECT b.id FROM brands b
            WHERE b.id = product_performance_metrics.brand_id
            AND (
                b.user_id = auth.uid() 
                OR 
                EXISTS (
                    SELECT 1 FROM brand_users bu
                    WHERE bu.brand_id = b.id
                    AND bu.user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY product_relationships_select_policy ON product_relationships
    FOR SELECT
    TO authenticated
    USING (
        brand_id IN (
            SELECT b.id FROM brands b
            WHERE b.id = product_relationships.brand_id
            AND (
                b.user_id = auth.uid() 
                OR 
                EXISTS (
                    SELECT 1 FROM brand_users bu
                    WHERE bu.brand_id = b.id
                    AND bu.user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY product_reviews_select_policy ON product_reviews
    FOR SELECT
    TO authenticated
    USING (
        brand_id IN (
            SELECT b.id FROM brands b
            WHERE b.id = product_reviews.brand_id
            AND (
                b.user_id = auth.uid() 
                OR 
                EXISTS (
                    SELECT 1 FROM brand_users bu
                    WHERE bu.brand_id = b.id
                    AND bu.user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY product_views_select_policy ON product_views
    FOR SELECT
    TO authenticated
    USING (
        brand_id IN (
            SELECT b.id FROM brands b
            WHERE b.id = product_views.brand_id
            AND (
                b.user_id = auth.uid() 
                OR 
                EXISTS (
                    SELECT 1 FROM brand_users bu
                    WHERE bu.brand_id = b.id
                    AND bu.user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY product_returns_select_policy ON product_returns
    FOR SELECT
    TO authenticated
    USING (
        brand_id IN (
            SELECT b.id FROM brands b
            WHERE b.id = product_returns.brand_id
            AND (
                b.user_id = auth.uid() 
                OR 
                EXISTS (
                    SELECT 1 FROM brand_users bu
                    WHERE bu.brand_id = b.id
                    AND bu.user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY inventory_turnover_select_policy ON inventory_turnover
    FOR SELECT
    TO authenticated
    USING (
        brand_id IN (
            SELECT b.id FROM brands b
            WHERE b.id = inventory_turnover.brand_id
            AND (
                b.user_id = auth.uid() 
                OR 
                EXISTS (
                    SELECT 1 FROM brand_users bu
                    WHERE bu.brand_id = b.id
                    AND bu.user_id = auth.uid()
                )
            )
        )
    );

-- Create policies for insert/update/delete access
-- These policies allow users to modify data for brands they own or have admin access to
CREATE POLICY product_performance_metrics_modify_policy ON product_performance_metrics
    FOR ALL
    TO authenticated
    USING (
        brand_id IN (
            SELECT b.id FROM brands b
            WHERE b.id = product_performance_metrics.brand_id
            AND (
                b.user_id = auth.uid() 
                OR 
                EXISTS (
                    SELECT 1 FROM brand_users bu
                    WHERE bu.brand_id = b.id
                    AND bu.user_id = auth.uid()
                    AND bu.role = 'admin'
                )
            )
        )
    );

CREATE POLICY product_relationships_modify_policy ON product_relationships
    FOR ALL
    TO authenticated
    USING (
        brand_id IN (
            SELECT b.id FROM brands b
            WHERE b.id = product_relationships.brand_id
            AND (
                b.user_id = auth.uid() 
                OR 
                EXISTS (
                    SELECT 1 FROM brand_users bu
                    WHERE bu.brand_id = b.id
                    AND bu.user_id = auth.uid()
                    AND bu.role = 'admin'
                )
            )
        )
    );

CREATE POLICY product_reviews_modify_policy ON product_reviews
    FOR ALL
    TO authenticated
    USING (
        brand_id IN (
            SELECT b.id FROM brands b
            WHERE b.id = product_reviews.brand_id
            AND (
                b.user_id = auth.uid() 
                OR 
                EXISTS (
                    SELECT 1 FROM brand_users bu
                    WHERE bu.brand_id = b.id
                    AND bu.user_id = auth.uid()
                    AND bu.role = 'admin'
                )
            )
        )
    );

CREATE POLICY product_views_modify_policy ON product_views
    FOR ALL
    TO authenticated
    USING (
        brand_id IN (
            SELECT b.id FROM brands b
            WHERE b.id = product_views.brand_id
            AND (
                b.user_id = auth.uid() 
                OR 
                EXISTS (
                    SELECT 1 FROM brand_users bu
                    WHERE bu.brand_id = b.id
                    AND bu.user_id = auth.uid()
                    AND bu.role = 'admin'
                )
            )
        )
    );

CREATE POLICY product_returns_modify_policy ON product_returns
    FOR ALL
    TO authenticated
    USING (
        brand_id IN (
            SELECT b.id FROM brands b
            WHERE b.id = product_returns.brand_id
            AND (
                b.user_id = auth.uid() 
                OR 
                EXISTS (
                    SELECT 1 FROM brand_users bu
                    WHERE bu.brand_id = b.id
                    AND bu.user_id = auth.uid()
                    AND bu.role = 'admin'
                )
            )
        )
    );

CREATE POLICY inventory_turnover_modify_policy ON inventory_turnover
    FOR ALL
    TO authenticated
    USING (
        brand_id IN (
            SELECT b.id FROM brands b
            WHERE b.id = inventory_turnover.brand_id
            AND (
                b.user_id = auth.uid() 
                OR 
                EXISTS (
                    SELECT 1 FROM brand_users bu
                    WHERE bu.brand_id = b.id
                    AND bu.user_id = auth.uid()
                    AND bu.role = 'admin'
                )
            )
        )
    );

-- Create a fallback policy for service role access
-- This allows the service role to access all data
DO $$
BEGIN
    -- Create policies for service role
    EXECUTE 'CREATE POLICY product_performance_metrics_service_policy ON product_performance_metrics
             FOR ALL
             TO service_role
             USING (true);';
             
    EXECUTE 'CREATE POLICY product_relationships_service_policy ON product_relationships
             FOR ALL
             TO service_role
             USING (true);';
             
    EXECUTE 'CREATE POLICY product_reviews_service_policy ON product_reviews
             FOR ALL
             TO service_role
             USING (true);';
             
    EXECUTE 'CREATE POLICY product_views_service_policy ON product_views
             FOR ALL
             TO service_role
             USING (true);';
             
    EXECUTE 'CREATE POLICY product_returns_service_policy ON product_returns
             FOR ALL
             TO service_role
             USING (true);';
             
    EXECUTE 'CREATE POLICY inventory_turnover_service_policy ON inventory_turnover
             FOR ALL
             TO service_role
             USING (true);';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error creating service role policies: %', SQLERRM;
END $$;

-- Verify that RLS is enabled
SELECT 
    tablename, 
    rowsecurity 
FROM 
    pg_tables 
WHERE 
    schemaname = 'public' 
    AND tablename IN (
        'product_performance_metrics',
        'product_relationships',
        'product_reviews',
        'product_views',
        'product_returns',
        'inventory_turnover'
    ); 