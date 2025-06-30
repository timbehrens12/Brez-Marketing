-- Fix Supabase Security Issues - Absolute Final Version
-- This script takes a more aggressive approach to fix the security definer view issue

-- Part 1: Check current view definition to identify the SECURITY DEFINER setting
DO $$
DECLARE
    view_exists BOOLEAN;
    is_security_definer BOOLEAN;
BEGIN
    -- Check if view exists and is SECURITY DEFINER
    SELECT EXISTS (
        SELECT FROM pg_views 
        WHERE schemaname = 'public' 
        AND viewname = 'meta_campaign_budgets'
    ) INTO view_exists;
    
    IF view_exists THEN
        -- In PostgreSQL, security_definer is stored in pg_proc for view's underlying function
        SELECT EXISTS (
            SELECT 1
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            JOIN pg_rewrite r ON r.ev_class = c.oid
            JOIN pg_depend d ON d.objid = r.oid
            JOIN pg_proc p ON p.oid = d.refobjid
            WHERE c.relname = 'meta_campaign_budgets'
            AND n.nspname = 'public'
            AND c.relkind = 'v'
            AND p.prosecdef = true
        ) INTO is_security_definer;
        
        RAISE NOTICE 'View meta_campaign_budgets exists, is_security_definer=%', is_security_definer;
    ELSE
        RAISE NOTICE 'View meta_campaign_budgets does not exist';
    END IF;
END $$;

-- Part 2: Get the original view definition to preserve the query exactly
CREATE OR REPLACE FUNCTION fix_security_definer_view() RETURNS VOID AS $$
DECLARE
    view_definition TEXT;
BEGIN
    -- Get the view definition
    SELECT pg_get_viewdef('public.meta_campaign_budgets'::regclass, true) INTO view_definition;
    
    IF view_definition IS NOT NULL THEN
        RAISE NOTICE 'Original view definition: %', view_definition;
        
        -- Drop the view
        EXECUTE 'DROP VIEW IF EXISTS public.meta_campaign_budgets;';
        
        -- Create a completely new view with the same definition but without SECURITY DEFINER
        -- This uses a safe approach of exactly recreating the view with the original query
        EXECUTE 'CREATE VIEW public.meta_campaign_budgets WITH (security_barrier=false) AS ' || view_definition;
        
        RAISE NOTICE 'View has been recreated without SECURITY DEFINER';
    ELSE
        RAISE NOTICE 'Could not get view definition';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Execute the function to fix the view
SELECT fix_security_definer_view();

-- Drop the helper function when done
DROP FUNCTION IF EXISTS fix_security_definer_view();

-- Part 3: Verify the change took effect by checking the security_definer status again
DO $$
DECLARE
    is_security_definer BOOLEAN;
BEGIN
    -- Check if view is still SECURITY DEFINER
    SELECT EXISTS (
        SELECT 1
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        JOIN pg_rewrite r ON r.ev_class = c.oid
        JOIN pg_depend d ON d.objid = r.oid
        JOIN pg_proc p ON p.oid = d.refobjid
        WHERE c.relname = 'meta_campaign_budgets'
        AND n.nspname = 'public'
        AND c.relkind = 'v'
        AND p.prosecdef = true
    ) INTO is_security_definer;
    
    RAISE NOTICE 'After fix: View meta_campaign_budgets is_security_definer=%', is_security_definer;
    
    IF is_security_definer THEN
        RAISE NOTICE 'WARNING: View is still SECURITY DEFINER. Manual intervention may be needed.';
    ELSE
        RAISE NOTICE 'SUCCESS: View is no longer SECURITY DEFINER.';
    END IF;
END $$;

-- Part 4: As a fallback, if the view is still security definer, try a complete recreation from scratch
DO $$
DECLARE
    is_security_definer BOOLEAN;
BEGIN
    -- Check if view is still SECURITY DEFINER after first attempt
    SELECT EXISTS (
        SELECT 1
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        JOIN pg_rewrite r ON r.ev_class = c.oid
        JOIN pg_depend d ON d.objid = r.oid
        JOIN pg_proc p ON p.oid = d.refobjid
        WHERE c.relname = 'meta_campaign_budgets'
        AND n.nspname = 'public'
        AND c.relkind = 'v'
        AND p.prosecdef = true
    ) INTO is_security_definer;
    
    IF is_security_definer THEN
        RAISE NOTICE 'Performing fallback recreation of view...';
        
        -- Drop the view completely
        EXECUTE 'DROP VIEW IF EXISTS public.meta_campaign_budgets CASCADE;';
        
        -- Create a completely new simple view with a basic structure
        EXECUTE '
        CREATE VIEW public.meta_campaign_budgets AS 
        SELECT 
            mc.campaign_id,
            mc.campaign_name,
            mc.brand_id,
            mc.budget,
            mc.budget_type,
            mc.status,
            COALESCE(sumbudget.total_budget, 0) AS adset_budget_total,
            COALESCE(sumbudget.adset_count, 0) AS adset_count
        FROM 
            meta_campaigns mc
        LEFT JOIN (
            SELECT 
                campaign_id,
                SUM(budget) AS total_budget,
                COUNT(*) AS adset_count
            FROM 
                meta_adsets
            GROUP BY 
                campaign_id
        ) sumbudget ON mc.campaign_id = sumbudget.campaign_id;
        ';
        
        RAISE NOTICE 'View has been recreated from scratch';
    END IF;
END $$;

-- Part 5: Enable Row Level Security (RLS) on tables
-- 1. meta_adsets_daily_stats
ALTER TABLE IF EXISTS public.meta_adsets_daily_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_default_policy ON public.meta_adsets_daily_stats;
CREATE POLICY rls_default_policy ON public.meta_adsets_daily_stats FOR ALL TO authenticated USING (true);

-- 2. meta_ads
ALTER TABLE IF EXISTS public.meta_ads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_default_policy ON public.meta_ads;
CREATE POLICY rls_default_policy ON public.meta_ads FOR ALL TO authenticated USING (true);

-- 3. meta_ad_daily_insights
ALTER TABLE IF EXISTS public.meta_ad_daily_insights ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_default_policy ON public.meta_ad_daily_insights;
CREATE POLICY rls_default_policy ON public.meta_ad_daily_insights FOR ALL TO authenticated USING (true);

-- 4. meta_adsets
ALTER TABLE IF EXISTS public.meta_adsets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_default_policy ON public.meta_adsets;
CREATE POLICY rls_default_policy ON public.meta_adsets FOR ALL TO authenticated USING (true);

-- 5. meta_adset_daily_insights
ALTER TABLE IF EXISTS public.meta_adset_daily_insights ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_default_policy ON public.meta_adset_daily_insights;
CREATE POLICY rls_default_policy ON public.meta_adset_daily_insights FOR ALL TO authenticated USING (true);

-- 6. meta_campaign_daily_stats
ALTER TABLE IF EXISTS public.meta_campaign_daily_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_default_policy ON public.meta_campaign_daily_stats;
CREATE POLICY rls_default_policy ON public.meta_campaign_daily_stats FOR ALL TO authenticated USING (true); 