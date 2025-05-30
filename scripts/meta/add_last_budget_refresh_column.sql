-- Add last_budget_refresh column to meta_campaigns table
ALTER TABLE public.meta_campaigns 
ADD COLUMN IF NOT EXISTS last_budget_refresh TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Add comment for documentation
COMMENT ON COLUMN public.meta_campaigns.last_budget_refresh IS 'Timestamp of when the campaign budget was last refreshed from Meta API';

-- Notify completion
DO $$
BEGIN
  RAISE NOTICE 'Added last_budget_refresh column to meta_campaigns table';
END $$; 