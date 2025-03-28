-- First, check if the views column already exists
DO $$
DECLARE
  column_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'meta_ad_insights' AND column_name = 'views'
  ) INTO column_exists;
  
  IF NOT column_exists THEN
    -- Add views column to the meta_ad_insights table if it doesn't exist
    RAISE NOTICE 'Adding views column to meta_ad_insights table...';
    ALTER TABLE meta_ad_insights ADD COLUMN views INTEGER DEFAULT 0;
    RAISE NOTICE 'Views column added successfully.';
  ELSE
    RAISE NOTICE 'Views column already exists in meta_ad_insights table.';
  END IF;
END$$;

-- Now, update the views column by copying reach values (for initial data population)
-- This ensures that existing data gets views values
DO $$
BEGIN
  RAISE NOTICE 'Updating views column with existing reach data...';
  
  UPDATE meta_ad_insights
  SET views = reach
  WHERE views = 0 OR views IS NULL;
  
  RAISE NOTICE 'Views data updated successfully.';
  RAISE NOTICE '';
  RAISE NOTICE 'IMPORTANT: To ensure new data includes views values, you need to:';
  RAISE NOTICE '1. Update the Meta service to populate the views column with reach data';
  RAISE NOTICE '2. Resync Meta data using the admin dashboard at /admin/meta-fix';
END$$; 