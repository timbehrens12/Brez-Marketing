-- Fix Meta Ad Insights table views columns
-- This script checks for and resolves duplicate view columns
-- and ensures proper data storage for Meta campaign views

-- First check and remove page_views column if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'meta_ad_insights' AND column_name = 'page_views'
    ) THEN
        -- Remove the page_views column
        ALTER TABLE meta_ad_insights DROP COLUMN page_views;
        
        RAISE NOTICE 'Removed duplicate page_views column from meta_ad_insights table.';
    ELSE
        RAISE NOTICE 'No page_views column found in meta_ad_insights table.';
    END IF;
END $$;

-- Ensure we have the views column properly configured
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'meta_ad_insights' AND column_name = 'views'
    ) THEN
        -- Add the views column if it doesn't exist
        ALTER TABLE meta_ad_insights ADD COLUMN views INTEGER DEFAULT 0;
        
        RAISE NOTICE 'Added views column to meta_ad_insights table.';
    ELSE
        -- If it exists, make sure it's the right type
        ALTER TABLE meta_ad_insights ALTER COLUMN views TYPE INTEGER USING views::INTEGER;
        RAISE NOTICE 'Ensured views column is properly typed as INTEGER.';
    END IF;
END $$;

-- Add an index on the views column for better query performance
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'meta_ad_insights' AND indexname = 'idx_meta_ad_insights_views'
    ) THEN
        CREATE INDEX idx_meta_ad_insights_views ON meta_ad_insights (views);
        RAISE NOTICE 'Added index on views column for better performance.';
    END IF;
END $$;

-- Show reminder
RAISE NOTICE '';
RAISE NOTICE 'IMPORTANT: You need to resync your Meta data to populate the views column correctly.';
RAISE NOTICE 'Use one of these methods to resync:';
RAISE NOTICE '1. Go to your dashboard and click on "Refresh Data" in the Meta Ads section';
RAISE NOTICE '2. Use the "Resync" button to fetch fresh data from Meta API including views';
RAISE NOTICE '3. Run the resync script: node scripts/resync_meta_data.js --brand-id YOUR_BRAND_ID'; 