-- This script will add a comment about the need to resync Meta data
-- to populate the reach column for existing records

DO $$
BEGIN
    RAISE NOTICE '----------------------------------------------------------------';
    RAISE NOTICE 'The reach column has been added to the meta_ad_insights table.';
    RAISE NOTICE '';
    RAISE NOTICE 'To populate this column with data for existing records, you need to:';
    RAISE NOTICE '1. Go to your dashboard';
    RAISE NOTICE '2. Click on "Refresh Data" in the Meta Ads section';
    RAISE NOTICE '3. Use the "Resync" button to resync your Meta data';
    RAISE NOTICE '';
    RAISE NOTICE 'This will fetch fresh data from the Meta API including reach values.';
    RAISE NOTICE '----------------------------------------------------------------';
END $$; 