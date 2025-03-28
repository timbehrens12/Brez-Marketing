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
    RAISE NOTICE 'IMPORTANT: You need to perform a FULL RESYNC of Meta data';
    RAISE NOTICE '';
    RAISE NOTICE 'The views detection has been improved to check multiple sources';
    RAISE NOTICE 'of video view data from Meta, including:';
    RAISE NOTICE '- video_views field';
    RAISE NOTICE '- video_plays field';
    RAISE NOTICE '- video_play_actions array';
    RAISE NOTICE '- video-related entries in the actions array';
    RAISE NOTICE '';
    RAISE NOTICE 'Follow these steps for a complete resync:';
    RAISE NOTICE '1. Go to your dashboard';
    RAISE NOTICE '2. Click on "Refresh Data" in the Meta Ads section';
    RAISE NOTICE '3. Use the "Resync" button with a longer date range (60+ days)';
    RAISE NOTICE '   to fetch fresh data from Meta API';
    RAISE NOTICE '';
    RAISE NOTICE 'If views still show as 0, please check the server logs for';
    RAISE NOTICE 'detailed information about what video metrics were found in';
    RAISE NOTICE 'your Meta Ads data.';
    RAISE NOTICE '-------------------------------------------------------------';
END $$; 