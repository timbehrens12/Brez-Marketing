
-- SQL script to remove page_views column and restore database
-- Run this with: psql YOUR_DATABASE_URL -f remove_page_views.sql

-- First, check if column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'meta_ad_insights' AND column_name = 'page_views'
  ) THEN
    -- Drop the column if it exists
    ALTER TABLE meta_ad_insights DROP COLUMN page_views;
    RAISE NOTICE 'Removed page_views column from meta_ad_insights table.';
  ELSE
    RAISE NOTICE 'page_views column not found in meta_ad_insights table.';
  END IF;
END $$;

-- Show success message
DO $$
BEGIN
  RAISE NOTICE '-------------------------------------------------------------';
  RAISE NOTICE 'Database rollback complete.';
  RAISE NOTICE 'Please resync your Meta data to restore functionality.';
  RAISE NOTICE '-------------------------------------------------------------';
END $$;
