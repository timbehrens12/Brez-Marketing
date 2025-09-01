-- fix-meta-campaign-budgets-view.sql
-- This script fixes the issue with meta_campaign_budgets where a view was defined on a table with the same name
-- causing a recursive definition that crashed the Supabase project

-- First, check if a view with this name exists
DO $$
DECLARE
  view_exists BOOLEAN;
  table_exists BOOLEAN;
BEGIN
  -- Check if view exists
  SELECT EXISTS (
    SELECT FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'v'
      AND c.relname = 'meta_campaign_budgets'
      AND n.nspname = 'public'
  ) INTO view_exists;
  
  -- Check if table exists
  SELECT EXISTS (
    SELECT FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r'
      AND c.relname = 'meta_campaign_budgets'
      AND n.nspname = 'public'
  ) INTO table_exists;
  
  RAISE NOTICE 'View exists: %, Table exists: %', view_exists, table_exists;
  
  -- If both exist, we need to fix the naming conflict
  IF view_exists AND table_exists THEN
    RAISE NOTICE 'Both a view and a table named meta_campaign_budgets exist. Fixing conflict...';
    
    -- Drop the view first
    EXECUTE 'DROP VIEW IF EXISTS public.meta_campaign_budgets CASCADE;';
    
    -- Create a new view with a different name that doesn't reference itself
    EXECUTE 'CREATE OR REPLACE VIEW public.meta_campaign_budgets_view AS
    SELECT 
      c.id,
      c.campaign_id,
      c.campaign_name,
      c.brand_id,
      c.status,
      c.objective,
      c.budget,
      c.budget_type,
      CASE 
        WHEN c.budget_type = ''daily'' THEN c.budget || ''/day''
        ELSE c.budget::text
      END AS formatted_budget,
      CASE
        WHEN c.budget_source IS NOT NULL THEN c.budget_source
        ELSE ''campaign''
      END AS budget_source,
      c.last_refresh_date
    FROM 
      public.meta_campaigns c
    WHERE 
      c.status != ''DELETED'';';
    
    RAISE NOTICE 'Created new view public.meta_campaign_budgets_view';
    
    -- Update the function to use the new view name
    EXECUTE 'CREATE OR REPLACE FUNCTION get_campaign_budgets(brand_uuid UUID)
    RETURNS TABLE (
      id UUID,
      campaign_id TEXT,
      campaign_name TEXT,
      budget DECIMAL,
      budget_type TEXT,
      formatted_budget TEXT,
      budget_source TEXT,
      status TEXT,
      objective TEXT,
      last_refresh_date TIMESTAMPTZ
    ) LANGUAGE plpgsql AS $func$
      BEGIN
        RETURN QUERY
        SELECT 
          b.id,
          b.campaign_id,
          b.campaign_name,
          b.budget,
          b.budget_type,
          b.formatted_budget,
          b.budget_source,
          b.status,
          b.objective,
          b.last_refresh_date
        FROM 
          meta_campaign_budgets_view b
        WHERE 
          b.brand_id = brand_uuid
        ORDER BY 
          b.status = ''ACTIVE'' DESC,
          b.budget DESC;
      END;
    $func$;';
    
    RAISE NOTICE 'Updated get_campaign_budgets function to use the new view';
    
  ELSIF view_exists THEN
    -- If only the view exists, let's make sure it's defined correctly
    RAISE NOTICE 'Only the view exists. Checking definition...';
    
    -- Drop and recreate the view to ensure it's defined correctly
    EXECUTE 'DROP VIEW IF EXISTS public.meta_campaign_budgets CASCADE;';
    
    EXECUTE 'CREATE OR REPLACE VIEW public.meta_campaign_budgets AS
    SELECT 
      c.id,
      c.campaign_id,
      c.campaign_name,
      c.brand_id,
      c.status,
      c.objective,
      c.budget,
      c.budget_type,
      CASE 
        WHEN c.budget_type = ''daily'' THEN c.budget || ''/day''
        ELSE c.budget::text
      END AS formatted_budget,
      CASE
        WHEN c.budget_source IS NOT NULL THEN c.budget_source
        ELSE ''campaign''
      END AS budget_source,
      c.last_refresh_date
    FROM 
      public.meta_campaigns c
    WHERE 
      c.status != ''DELETED'';';
    
    RAISE NOTICE 'Recreated meta_campaign_budgets view with correct definition';
    
  ELSIF table_exists THEN
    -- If only the table exists, create the view with a different name
    RAISE NOTICE 'Only the table exists. Creating view with different name...';
    
    EXECUTE 'CREATE OR REPLACE VIEW public.meta_campaign_budgets_view AS
    SELECT 
      c.id,
      c.campaign_id,
      c.campaign_name,
      c.brand_id,
      c.status,
      c.objective,
      c.budget,
      c.budget_type,
      CASE 
        WHEN c.budget_type = ''daily'' THEN c.budget || ''/day''
        ELSE c.budget::text
      END AS formatted_budget,
      CASE
        WHEN c.budget_source IS NOT NULL THEN c.budget_source
        ELSE ''campaign''
      END AS budget_source,
      c.last_refresh_date
    FROM 
      public.meta_campaigns c
    WHERE 
      c.status != ''DELETED'';';
    
    RAISE NOTICE 'Created meta_campaign_budgets_view';
    
    -- Update the function to use the new view name
    EXECUTE 'CREATE OR REPLACE FUNCTION get_campaign_budgets(brand_uuid UUID)
    RETURNS TABLE (
      id UUID,
      campaign_id TEXT,
      campaign_name TEXT,
      budget DECIMAL,
      budget_type TEXT,
      formatted_budget TEXT,
      budget_source TEXT,
      status TEXT,
      objective TEXT,
      last_refresh_date TIMESTAMPTZ
    ) LANGUAGE plpgsql AS $func$
      BEGIN
        RETURN QUERY
        SELECT 
          b.id,
          b.campaign_id,
          b.campaign_name,
          b.budget,
          b.budget_type,
          b.formatted_budget,
          b.budget_source,
          b.status,
          b.objective,
          b.last_refresh_date
        FROM 
          meta_campaign_budgets_view b
        WHERE 
          b.brand_id = brand_uuid
        ORDER BY 
          b.status = ''ACTIVE'' DESC,
          b.budget DESC;
      END;
    $func$;';
    
    RAISE NOTICE 'Updated get_campaign_budgets function to use the new view';
  ELSE
    -- If neither exists, create the view normally
    RAISE NOTICE 'Neither view nor table exists. Creating view...';
    
    EXECUTE 'CREATE OR REPLACE VIEW public.meta_campaign_budgets AS
    SELECT 
      c.id,
      c.campaign_id,
      c.campaign_name,
      c.brand_id,
      c.status,
      c.objective,
      c.budget,
      c.budget_type,
      CASE 
        WHEN c.budget_type = ''daily'' THEN c.budget || ''/day''
        ELSE c.budget::text
      END AS formatted_budget,
      CASE
        WHEN c.budget_source IS NOT NULL THEN c.budget_source
        ELSE ''campaign''
      END AS budget_source,
      c.last_refresh_date
    FROM 
      public.meta_campaigns c
    WHERE 
      c.status != ''DELETED'';';
    
    RAISE NOTICE 'Created meta_campaign_budgets view';
  END IF;
END $$; 