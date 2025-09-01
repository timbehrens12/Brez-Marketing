-- Add last_budget_refresh column to meta_campaigns table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'meta_campaigns'
    AND column_name = 'last_budget_refresh'
  ) THEN
    ALTER TABLE public.meta_campaigns 
    ADD COLUMN last_budget_refresh TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    
    -- Add comment for documentation
    COMMENT ON COLUMN public.meta_campaigns.last_budget_refresh IS 'Timestamp of when the campaign budget was last refreshed from Meta API';
    
    RAISE NOTICE 'Added last_budget_refresh column to meta_campaigns table';
  ELSE
    RAISE NOTICE 'last_budget_refresh column already exists in meta_campaigns table';
  END IF;
END $$; 