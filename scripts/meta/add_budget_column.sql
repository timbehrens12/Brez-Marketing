-- Add budget column to meta_ad_insights table
ALTER TABLE public.meta_ad_insights
ADD COLUMN IF NOT EXISTS budget DECIMAL(12,2) DEFAULT 0;

-- Add a comment for documentation
COMMENT ON COLUMN public.meta_ad_insights.budget IS 'Campaign budget (daily or lifetime) at time of data collection';

-- Notify of completion
DO $$
BEGIN
  RAISE NOTICE 'Added budget column to meta_ad_insights table';
END $$; 