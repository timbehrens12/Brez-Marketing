-- Update views values based on reach for existing records
UPDATE public.meta_ad_insights 
SET views = reach 
WHERE (views IS NULL OR views = 0) AND reach IS NOT NULL AND reach > 0;

-- Log the count of updated records
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count
  FROM public.meta_ad_insights
  WHERE views > 0;
  
  RAISE NOTICE 'Meta ad insights updated: % records now have views data', updated_count;
END $$; 