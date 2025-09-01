-- Add budget_source column to meta_campaigns table
ALTER TABLE public.meta_campaigns 
ADD COLUMN IF NOT EXISTS budget_source TEXT;

COMMENT ON COLUMN public.meta_campaigns.budget_source IS 'Source of budget info (campaign_daily, adset_daily, etc.)';

-- Notify completion
DO $$
BEGIN
  RAISE NOTICE 'Added budget_source column to meta_campaigns table';
END $$; 