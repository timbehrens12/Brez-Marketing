-- Update script to add page_views column to meta_ad_insights table
-- Run this script to add support for page views data from Meta Ads API

-- Step 1: Add page_views column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'meta_ad_insights' AND column_name = 'page_views'
    ) THEN
        ALTER TABLE meta_ad_insights ADD COLUMN page_views INTEGER DEFAULT 0;
        RAISE NOTICE 'Added page_views column to meta_ad_insights table.';
    ELSE
        RAISE NOTICE 'page_views column already exists in meta_ad_insights table.';
    END IF;
END $$;

-- Show instructions to the user
DO $$
BEGIN
    RAISE NOTICE '-------------------------------------------------------------';
    RAISE NOTICE 'IMPORTANT: You need to refresh your Meta data to populate the page_views column';
    RAISE NOTICE 'Follow these steps:';
    RAISE NOTICE '1. Go to your dashboard';
    RAISE NOTICE '2. Click on "Refresh Data" in the Meta Ads section';
    RAISE NOTICE '3. Use the "Resync" button to fetch fresh data from Meta API';
    RAISE NOTICE '-------------------------------------------------------------';
END $$; 