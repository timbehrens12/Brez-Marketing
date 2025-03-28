-- Check if views column already exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'meta_ad_insights' 
    AND column_name = 'views'
  ) THEN
    -- Add views column if it doesn't exist
    ALTER TABLE public.meta_ad_insights ADD COLUMN views INTEGER DEFAULT 0;
    
    -- Update existing records to set views = reach
    UPDATE public.meta_ad_insights SET views = reach WHERE reach IS NOT NULL;
    
    RAISE NOTICE 'Views column added and populated from reach data';
  ELSE
    RAISE NOTICE 'Views column already exists';
  END IF;
END $$; 