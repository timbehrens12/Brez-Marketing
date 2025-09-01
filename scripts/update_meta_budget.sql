-- Update Meta Ad Insights Table
-- Add budget column and remove frequency column

-- Step 1: Add budget column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'meta_ad_insights' 
        AND column_name = 'budget'
    ) THEN
        ALTER TABLE meta_ad_insights ADD COLUMN budget DECIMAL(15,2) DEFAULT 0;
        RAISE NOTICE 'Added budget column to meta_ad_insights table';
    ELSE
        RAISE NOTICE 'budget column already exists in meta_ad_insights table';
    END IF;
END $$;

-- Step 2: Remove frequency column if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'meta_ad_insights' 
        AND column_name = 'frequency'
    ) THEN
        ALTER TABLE meta_ad_insights DROP COLUMN frequency;
        RAISE NOTICE 'Removed frequency column from meta_ad_insights table';
    ELSE
        RAISE NOTICE 'frequency column does not exist in meta_ad_insights table';
    END IF;
END $$;

-- Step 3: Create index on budget column for better query performance
CREATE INDEX IF NOT EXISTS idx_meta_ad_insights_budget ON meta_ad_insights(budget);

-- Provide information about updating the data
RAISE NOTICE '==========================================================';
RAISE NOTICE 'IMPORTANT: To populate budget data, you need to:';
RAISE NOTICE '1. Resync Meta data from your dashboard';
RAISE NOTICE '2. Click on "Refresh Data" in the Meta Ads section';
RAISE NOTICE '3. Use the "Resync" button to fetch fresh data from Meta API';
RAISE NOTICE '==========================================================';
