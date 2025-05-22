-- Fix Supabase Security Issues - Materialized View Approach
-- This script uses materialized views which don't have SECURITY DEFINER issues

-- Step 1: Drop both problematic views
DROP VIEW IF EXISTS public.meta_campaign_budgets CASCADE;
DROP VIEW IF EXISTS public.meta_campaign_budget_safe CASCADE;

-- Step 2: Create a materialized view which doesn't have SECURITY DEFINER properties
CREATE MATERIALIZED VIEW public.meta_campaign_budgets_mat AS 
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

-- Step 3: Drop existing functions and triggers first to avoid errors
DROP FUNCTION IF EXISTS refresh_meta_campaign_budgets() CASCADE;
DROP FUNCTION IF EXISTS trigger_refresh_meta_campaign_budgets() CASCADE;
DROP TRIGGER IF EXISTS refresh_meta_campaign_budgets_trigger ON meta_campaigns;
DROP TRIGGER IF EXISTS refresh_meta_campaign_budgets_trigger ON meta_adsets;

-- Create a refresh function that will be called to update the materialized view
CREATE OR REPLACE FUNCTION refresh_meta_campaign_budgets()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW public.meta_campaign_budgets_mat;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create a trigger to keep the materialized view up-to-date
-- First create a trigger function
CREATE OR REPLACE FUNCTION trigger_refresh_meta_campaign_budgets()
RETURNS TRIGGER AS $$
BEGIN
    -- Queue a refresh of the materialized view
    PERFORM pg_notify('refresh_meta_campaign_budgets', '');
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers on the source tables
-- For meta_campaigns table
CREATE TRIGGER refresh_meta_campaign_budgets_trigger
AFTER INSERT OR UPDATE OR DELETE ON meta_campaigns
FOR EACH STATEMENT EXECUTE FUNCTION trigger_refresh_meta_campaign_budgets();

-- For meta_adsets table
CREATE TRIGGER refresh_meta_campaign_budgets_trigger
AFTER INSERT OR UPDATE OR DELETE ON meta_adsets
FOR EACH STATEMENT EXECUTE FUNCTION trigger_refresh_meta_campaign_budgets();

-- Step 5: Create a view over the materialized view for backward compatibility
-- This should not have SECURITY DEFINER since it's just a simple wrapper
CREATE OR REPLACE VIEW public.meta_campaign_budgets AS
SELECT * FROM public.meta_campaign_budgets_mat;

-- Step 6: Enable Row Level Security (RLS) on tables
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

-- Step 7: Execute an initial refresh of the materialized view
SELECT refresh_meta_campaign_budgets(); 