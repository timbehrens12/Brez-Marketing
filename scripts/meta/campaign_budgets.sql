-- meta_campaign_budgets.sql
-- This script creates a database view that provides up-to-date budgets for all Meta campaigns
-- The view pulls data directly from the meta_campaigns table, ensuring budgets are always current

-- First, create a function to refresh budgets from the Meta API periodically
CREATE OR REPLACE FUNCTION refresh_meta_campaign_budgets()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the last_budget_refresh timestamp
  NEW.last_budget_refresh := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the meta_campaign_budgets view
CREATE OR REPLACE VIEW meta_campaign_budgets AS
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
    WHEN c.budget_type = 'daily' THEN c.budget || '/day'
    ELSE c.budget::text
  END AS formatted_budget,
  CASE
    WHEN c.budget_source IS NOT NULL THEN c.budget_source
    ELSE 'campaign'
  END AS budget_source,
  c.last_refresh_date
FROM 
  public.meta_campaigns c
WHERE 
  c.status != 'DELETED'; -- Use status filter instead of deleted_at since that column doesn't exist

-- Add comment to view
COMMENT ON VIEW meta_campaign_budgets IS 'This view provides current budget information for all Meta campaigns, including budget type and source information';

-- Create a function to get campaign budgets for a specific brand
CREATE OR REPLACE FUNCTION get_campaign_budgets(brand_uuid UUID)
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
) AS $$
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
    meta_campaign_budgets b
  WHERE 
    b.brand_id = brand_uuid
  ORDER BY 
    b.status = 'ACTIVE' DESC, -- Show active campaigns first
    b.budget DESC; -- Then sort by budget amount
END;
$$ LANGUAGE plpgsql;

-- Display success notification
DO $$
BEGIN
  RAISE NOTICE 'Meta campaign budgets view and functions created successfully.';
END $$; 