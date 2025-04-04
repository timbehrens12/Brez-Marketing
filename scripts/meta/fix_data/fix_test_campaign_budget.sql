-- Direct fix for test campaigns with estimated budgets
-- This script will set all test campaigns to use a fixed $1.00 daily budget

-- 1. Fix specifically the test campaign with ID 120218263352990058
UPDATE public.meta_campaigns
SET 
  budget = 1.00,
  budget_type = 'daily',
  budget_source = 'sql_fix'
WHERE 
  campaign_id = '120218263352990058'
  OR campaign_name LIKE '%TEST%'
  OR campaign_name LIKE '%Test%'
  OR campaign_name LIKE '%DO NOT USE%';

-- 2. Fix any campaigns with 'estimated' budget type
UPDATE public.meta_campaigns
SET 
  budget_type = 'daily',
  budget_source = COALESCE(budget_source, 'sql_fix_estimated')
WHERE 
  budget_type = 'estimated';

-- 3. Fix any campaigns with no budget_source
UPDATE public.meta_campaigns
SET 
  budget_source = 'sql_fix_missing_source'
WHERE 
  budget_source IS NULL;

-- Notify completion
DO $$
BEGIN
  RAISE NOTICE 'Fixed test campaign budgets and campaigns with estimated budgets';
END $$; 