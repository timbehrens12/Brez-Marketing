-- Script to fix Meta data issues
-- Run this script to restore functioning Meta data

-- Step 1: Check table structure
DO $$
BEGIN
    RAISE NOTICE 'Checking meta_ad_insights table structure...';
END $$;

-- Step 2: Fix permissions if needed
DO $$
BEGIN
    RAISE NOTICE 'Fixing permissions...';
    -- Ensure the service role has proper permissions
    GRANT ALL PRIVILEGES ON TABLE meta_ad_insights TO service_role;
    GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
END $$;

-- Step 3: Get a count of records to check data availability
DO $$
DECLARE
    record_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO record_count FROM meta_ad_insights;
    RAISE NOTICE 'Current record count in meta_ad_insights: %', record_count;
    
    IF record_count = 0 THEN
        RAISE NOTICE 'Warning: No records found in meta_ad_insights table!';
        RAISE NOTICE 'You need to resync your Meta data.';
    END IF;
END $$;

-- Step 4: Ensure all necessary columns exist
DO $$
BEGIN
    -- Ensure page_views column exists with proper type and default
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'meta_ad_insights' AND column_name = 'page_views'
    ) THEN
        ALTER TABLE meta_ad_insights ADD COLUMN page_views INTEGER DEFAULT 0;
        RAISE NOTICE 'Added page_views column to meta_ad_insights table.';
    ELSE
        RAISE NOTICE 'page_views column already exists in meta_ad_insights table.';
    END IF;
    
    -- Ensure reach column exists
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'meta_ad_insights' AND column_name = 'reach'
    ) THEN
        ALTER TABLE meta_ad_insights ADD COLUMN reach INTEGER DEFAULT 0;
        RAISE NOTICE 'Added reach column to meta_ad_insights table.';
    ELSE
        RAISE NOTICE 'reach column already exists in meta_ad_insights table.';
    END IF;
    
    -- Ensure link_clicks column exists
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'meta_ad_insights' AND column_name = 'link_clicks'
    ) THEN
        ALTER TABLE meta_ad_insights ADD COLUMN link_clicks INTEGER DEFAULT 0;
        RAISE NOTICE 'Added link_clicks column to meta_ad_insights table.';
    ELSE
        RAISE NOTICE 'link_clicks column already exists in meta_ad_insights table.';
    END IF;
END $$;

-- Step 5: Show instructions to the user
DO $$
BEGIN
    RAISE NOTICE '-------------------------------------------------------------';
    RAISE NOTICE 'Repair completed. Follow these steps to restore your Meta data:';
    RAISE NOTICE '';
    RAISE NOTICE '1. Go to your dashboard';
    RAISE NOTICE '2. Click on "Refresh Data" in the Meta Ads section';
    RAISE NOTICE '3. Use the "Resync" button to fetch fresh data from Meta API';
    RAISE NOTICE '';
    RAISE NOTICE 'This will repopulate your database with the latest Meta metrics';
    RAISE NOTICE '-------------------------------------------------------------';
END $$; 