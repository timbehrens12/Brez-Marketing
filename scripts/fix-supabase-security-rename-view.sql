-- Fix Supabase Security Issues - Rename View Approach
-- This script takes a completely different approach by renaming the problematic view

-- Step 1: Create a new view with a different name
CREATE OR REPLACE VIEW public.meta_campaign_budget_safe AS 
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

-- Step 2: Check if any database objects reference the old view
DO $$
DECLARE
    dependencies RECORD;
BEGIN
    RAISE NOTICE 'Checking dependencies on meta_campaign_budgets:';
    
    FOR dependencies IN (
        SELECT DISTINCT n.nspname AS schema_name, d.refclassid::regclass AS ref_type, c.relname AS object_name
        FROM pg_depend d
        JOIN pg_class c ON d.refobjid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE d.objid = 'public.meta_campaign_budgets'::regclass AND d.deptype = 'n'
    ) LOOP
        RAISE NOTICE 'Dependency found: %.% (type: %)', 
            dependencies.schema_name, dependencies.object_name, dependencies.ref_type;
    END LOOP;
END $$;

-- Step 3: Create a wrapper view to temporarily maintain backward compatibility
-- This allows existing code to keep working while you transition to the new view name
CREATE OR REPLACE VIEW public.meta_campaign_budgets AS
SELECT * FROM public.meta_campaign_budget_safe;

-- Step 4: Show a warning message for manual follow-up
DO $$
BEGIN
    RAISE NOTICE '-----------------------------------------------------------------------';
    RAISE NOTICE 'IMPORTANT: You should update your application code to use the new view:';
    RAISE NOTICE '  meta_campaign_budget_safe instead of meta_campaign_budgets';
    RAISE NOTICE '';
    RAISE NOTICE 'After updating application code, drop the old view with:';
    RAISE NOTICE 'DROP VIEW IF EXISTS public.meta_campaign_budgets;';
    RAISE NOTICE '-----------------------------------------------------------------------';
END $$;

-- Step 5: Enable Row Level Security (RLS) on tables
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