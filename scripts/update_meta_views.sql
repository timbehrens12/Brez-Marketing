-- Update Meta Ad Insights table to add views column
-- This script adds a views column to store campaign view data from Meta API

-- First check if the column already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'meta_ad_insights' AND column_name = 'views'
    ) THEN
        -- Add the views column
        ALTER TABLE meta_ad_insights ADD COLUMN views INTEGER DEFAULT 0;
        
        -- Add a notice to inform about the change
        RAISE NOTICE 'The views column has been added to meta_ad_insights table.';
        RAISE NOTICE 'IMPORTANT: You need to refresh your Meta data to populate the views column.';
        RAISE NOTICE 'Go to your dashboard and click on "Refresh Data" in the Meta Ads section.';
        RAISE NOTICE 'Or use the "Resync" button to fetch fresh data from Meta API including views.';
    ELSE
        RAISE NOTICE 'The views column already exists in meta_ad_insights table.';
    END IF;
END $$;

-- Remove the frequency column if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'meta_ad_insights' AND column_name = 'frequency'
    ) THEN
        -- Remove the frequency column
        ALTER TABLE meta_ad_insights DROP COLUMN frequency;
        
        RAISE NOTICE 'The frequency column has been removed from meta_ad_insights table.';
    ELSE
        RAISE NOTICE 'The frequency column does not exist in meta_ad_insights table.';
    END IF;
END $$; 