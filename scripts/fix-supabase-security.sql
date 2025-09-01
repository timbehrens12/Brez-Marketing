-- Fix Supabase Security Issues
-- This script addresses the security linting errors in the Supabase database

-- Part 1: Fix security definer view
-- Convert view meta_campaign_budgets to use SECURITY INVOKER (default) instead of SECURITY DEFINER

-- First, get the view definition
CREATE OR REPLACE FUNCTION temp_get_view_definition() 
RETURNS TEXT AS $$
DECLARE
    view_def TEXT;
BEGIN
    SELECT pg_get_viewdef('public.meta_campaign_budgets'::regclass, true) INTO view_def;
    RETURN view_def;
END;
$$ LANGUAGE plpgsql;

-- Store the view definition
DO $$
DECLARE
    view_definition TEXT;
BEGIN
    SELECT temp_get_view_definition() INTO view_definition;
    
    -- Drop the old view
    DROP VIEW IF EXISTS public.meta_campaign_budgets;
    
    -- Recreate the view with the same definition but without SECURITY DEFINER
    EXECUTE 'CREATE VIEW public.meta_campaign_budgets AS ' || view_definition;
    
    -- Add a comment explaining the change
    COMMENT ON VIEW public.meta_campaign_budgets IS 'View recreated with SECURITY INVOKER (default) instead of SECURITY DEFINER for better security';
END
$$;

-- Clean up the temporary function
DROP FUNCTION IF EXISTS temp_get_view_definition();

-- Part 2: Enable Row Level Security (RLS) on tables
-- For each table mentioned in the errors, we'll enable RLS and create appropriate policies

-- 1. meta_adsets_daily_stats
ALTER TABLE public.meta_adsets_daily_stats ENABLE ROW LEVEL SECURITY;

-- Create RLS policy based on brand_id
CREATE POLICY meta_adsets_daily_stats_brand_access
    ON public.meta_adsets_daily_stats
    FOR ALL
    USING (brand_id IN (
        SELECT b.id::text FROM public.brands b
        WHERE b.user_id = auth.uid()
    ));

-- 2. meta_ads
ALTER TABLE public.meta_ads ENABLE ROW LEVEL SECURITY;

-- Create RLS policy based on brand_id
CREATE POLICY meta_ads_brand_access
    ON public.meta_ads
    FOR ALL
    USING (brand_id IN (
        SELECT b.id::text FROM public.brands b
        WHERE b.user_id = auth.uid()
    ));

-- 3. meta_ad_daily_insights
ALTER TABLE public.meta_ad_daily_insights ENABLE ROW LEVEL SECURITY;

-- Create RLS policy 
CREATE POLICY meta_ad_daily_insights_brand_access
    ON public.meta_ad_daily_insights
    FOR ALL
    USING (ad_id IN (
        SELECT a.ad_id FROM public.meta_ads a
        WHERE a.brand_id IN (
            SELECT b.id::text FROM public.brands b
            WHERE b.user_id = auth.uid()
        )
    ));

-- 4. meta_adsets
ALTER TABLE public.meta_adsets ENABLE ROW LEVEL SECURITY;

-- Create RLS policy based on brand_id
CREATE POLICY meta_adsets_brand_access
    ON public.meta_adsets
    FOR ALL
    USING (brand_id IN (
        SELECT b.id::text FROM public.brands b
        WHERE b.user_id = auth.uid()
    ));

-- 5. meta_adset_daily_insights
ALTER TABLE public.meta_adset_daily_insights ENABLE ROW LEVEL SECURITY;

-- Create RLS policy 
CREATE POLICY meta_adset_daily_insights_brand_access
    ON public.meta_adset_daily_insights
    FOR ALL
    USING (adset_id IN (
        SELECT a.adset_id FROM public.meta_adsets a
        WHERE a.brand_id IN (
            SELECT b.id::text FROM public.brands b
            WHERE b.user_id = auth.uid()
        )
    ));

-- 6. meta_campaign_daily_stats
ALTER TABLE public.meta_campaign_daily_stats ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY meta_campaign_daily_stats_brand_access
    ON public.meta_campaign_daily_stats
    FOR ALL
    USING (campaign_id IN (
        SELECT c.campaign_id FROM public.meta_campaigns c
        WHERE c.brand_id IN (
            SELECT b.id::text FROM public.brands b
            WHERE b.user_id = auth.uid()
        )
    ));

-- Add fallback policy if the table has brand_id directly
CREATE POLICY meta_campaign_daily_stats_direct_brand_access
    ON public.meta_campaign_daily_stats
    FOR ALL
    USING (
        CASE 
            WHEN brand_id IS NOT NULL THEN 
                brand_id IN (
                    SELECT b.id::text FROM public.brands b
                    WHERE b.user_id = auth.uid()
                )
            ELSE false
        END
    );

-- Add service role policy for all tables to ensure server-side access works
-- These policies ensure that the service role can always access all records

-- Create a function to check if the request is from the service role
CREATE OR REPLACE FUNCTION auth.is_service_role() RETURNS boolean AS $$
BEGIN
    -- When using service_role key, this will be true
    RETURN current_setting('request.jwt.claims', true)::json->>'role' = 'service_role';
EXCEPTION
    -- If any error occurs (like when no JWT is present), return false
    WHEN others THEN RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add service role policies to all tables
CREATE POLICY service_role_access ON public.meta_adsets_daily_stats FOR ALL USING (auth.is_service_role());
CREATE POLICY service_role_access ON public.meta_ads FOR ALL USING (auth.is_service_role());
CREATE POLICY service_role_access ON public.meta_ad_daily_insights FOR ALL USING (auth.is_service_role());
CREATE POLICY service_role_access ON public.meta_adsets FOR ALL USING (auth.is_service_role());
CREATE POLICY service_role_access ON public.meta_adset_daily_insights FOR ALL USING (auth.is_service_role());
CREATE POLICY service_role_access ON public.meta_campaign_daily_stats FOR ALL USING (auth.is_service_role());

-- Create a function to check if the request is using the postgres role
CREATE OR REPLACE FUNCTION auth.is_postgres_role() RETURNS boolean AS $$
BEGIN
    RETURN current_user = 'postgres';
EXCEPTION
    WHEN others THEN RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add postgres role policies to all tables
CREATE POLICY postgres_role_access ON public.meta_adsets_daily_stats FOR ALL USING (auth.is_postgres_role());
CREATE POLICY postgres_role_access ON public.meta_ads FOR ALL USING (auth.is_postgres_role());
CREATE POLICY postgres_role_access ON public.meta_ad_daily_insights FOR ALL USING (auth.is_postgres_role());
CREATE POLICY postgres_role_access ON public.meta_adsets FOR ALL USING (auth.is_postgres_role());
CREATE POLICY postgres_role_access ON public.meta_adset_daily_insights FOR ALL USING (auth.is_postgres_role());
CREATE POLICY postgres_role_access ON public.meta_campaign_daily_stats FOR ALL USING (auth.is_postgres_role());

-- Grant appropriate permissions to service role
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Verify the changes (these queries will show RLS settings and policies)
SELECT 
    tablename,
    rowlevelsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
    'meta_adsets_daily_stats',
    'meta_ads',
    'meta_ad_daily_insights',
    'meta_adsets',
    'meta_adset_daily_insights',
    'meta_campaign_daily_stats'
);

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN (
    'meta_adsets_daily_stats',
    'meta_ads',
    'meta_ad_daily_insights',
    'meta_adsets',
    'meta_adset_daily_insights',
    'meta_campaign_daily_stats'
); 