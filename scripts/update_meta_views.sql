-- Update script to add views column and remove frequency column from meta_ad_insights table
-- Run this script to add support for video views data from Meta Ads API

-- Remove frequency column if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'meta_ad_insights' AND column_name = 'frequency'
    ) THEN
        ALTER TABLE meta_ad_insights DROP COLUMN frequency;
        RAISE NOTICE 'Removed frequency column from meta_ad_insights table.';
    ELSE
        RAISE NOTICE 'frequency column does not exist in meta_ad_insights table.';
    END IF;
END $$;

-- Add views column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'meta_ad_insights' AND column_name = 'views'
    ) THEN
        ALTER TABLE meta_ad_insights ADD COLUMN views INTEGER DEFAULT 0;
        RAISE NOTICE 'Added views column to meta_ad_insights table.';
    ELSE
        RAISE NOTICE 'views column already exists in meta_ad_insights table.';
    END IF;
END $$;

-- Show instructions to the user
DO $$
BEGIN
    RAISE NOTICE '-------------------------------------------------------------';
    RAISE NOTICE 'IMPORTANT: You need to refresh your Meta data to populate the views column';
    RAISE NOTICE 'Follow these steps:';
    RAISE NOTICE '1. Go to your dashboard';
    RAISE NOTICE '2. Click on "Refresh Data" in the Meta Ads section';
    RAISE NOTICE '3. Use the "Resync" button to fetch fresh data from Meta API';
    RAISE NOTICE '';
    RAISE NOTICE 'The new data will include video views from your Meta ads.';
    RAISE NOTICE '-------------------------------------------------------------';
END $$; 