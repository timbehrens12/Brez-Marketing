-- Fix Supabase Security Issues - Alternative Approach
-- This script addresses the security linting errors in the Supabase database

-- Part 1: Fix security definer view
DROP VIEW IF EXISTS public.meta_campaign_budgets;
CREATE VIEW public.meta_campaign_budgets AS 
SELECT 
    mc.campaign_id,
    mc.campaign_name,
    mc.brand_id,
    mc.budget,
    mc.budget_type,
    mc.status,
    mas.budget AS adset_budget_total,
    mas.adset_count
FROM 
    meta_campaigns mc
LEFT JOIN (
    SELECT 
        campaign_id,
        SUM(budget) AS budget,
        COUNT(*) AS adset_count
    FROM 
        meta_adsets
    GROUP BY 
        campaign_id
) mas ON mc.campaign_id = mas.campaign_id;

-- Part 2: Enable Row Level Security (RLS) on tables
-- 1. meta_adsets_daily_stats
ALTER TABLE public.meta_adsets_daily_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS meta_adsets_daily_stats_policy ON public.meta_adsets_daily_stats;
CREATE POLICY meta_adsets_daily_stats_policy ON public.meta_adsets_daily_stats AS PERMISSIVE FOR ALL TO authenticated USING (true);

-- 2. meta_ads
ALTER TABLE public.meta_ads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS meta_ads_policy ON public.meta_ads;
CREATE POLICY meta_ads_policy ON public.meta_ads AS PERMISSIVE FOR ALL TO authenticated USING (true);

-- 3. meta_ad_daily_insights
ALTER TABLE public.meta_ad_daily_insights ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS meta_ad_daily_insights_policy ON public.meta_ad_daily_insights;
CREATE POLICY meta_ad_daily_insights_policy ON public.meta_ad_daily_insights AS PERMISSIVE FOR ALL TO authenticated USING (true);

-- 4. meta_adsets
ALTER TABLE public.meta_adsets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS meta_adsets_policy ON public.meta_adsets;
CREATE POLICY meta_adsets_policy ON public.meta_adsets AS PERMISSIVE FOR ALL TO authenticated USING (true);

-- 5. meta_adset_daily_insights
ALTER TABLE public.meta_adset_daily_insights ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS meta_adset_daily_insights_policy ON public.meta_adset_daily_insights;
CREATE POLICY meta_adset_daily_insights_policy ON public.meta_adset_daily_insights AS PERMISSIVE FOR ALL TO authenticated USING (true);

-- 6. meta_campaign_daily_stats
ALTER TABLE public.meta_campaign_daily_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS meta_campaign_daily_stats_policy ON public.meta_campaign_daily_stats;
CREATE POLICY meta_campaign_daily_stats_policy ON public.meta_campaign_daily_stats AS PERMISSIVE FOR ALL TO authenticated USING (true);

-- Verify the changes
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