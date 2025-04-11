-- Update script to add link_clicks column to meta_ad_insights table
-- Run this script to add support for link clicks data from Meta Ads API

-- Add link_clicks column if it doesn't exist
DO $$
BEGIN
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

-- Show instructions to the user
DO $$
BEGIN
    RAISE NOTICE '-------------------------------------------------------------';
    RAISE NOTICE 'IMPORTANT: You need to refresh your Meta data to populate the link_clicks column';
    RAISE NOTICE 'Follow these steps:';
    RAISE NOTICE '1. Go to your dashboard';
    RAISE NOTICE '2. Click on "Refresh Data" in the Meta Ads section';
    RAISE NOTICE '3. Use the "Resync" button to fetch fresh data from Meta API';
    RAISE NOTICE '-------------------------------------------------------------';
END $$;

-- Optional: Create a function to calculate CTR (Click-Through Rate)
CREATE OR REPLACE FUNCTION calculate_ctr(impressions INTEGER, clicks INTEGER)
RETURNS DECIMAL AS $$
BEGIN
    IF impressions IS NULL OR impressions = 0 THEN
        RETURN 0;
    ELSE
        RETURN (COALESCE(clicks, 0)::DECIMAL / impressions::DECIMAL) * 100;
    END IF;
END;
$$ LANGUAGE plpgsql; 