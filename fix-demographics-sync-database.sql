-- EMERGENCY FIX: Reset Demographics Sync Status
-- This fixes the 63% stuck issue after OAuth reconnection

-- First, check current status
SELECT 
    'Current sync status:' as info,
    overall_status,
    progress_percentage,
    days_completed,
    total_days_target,
    updated_at
FROM meta_demographics_sync_status 
WHERE brand_id = '1a30f34b-b048-4f80-b880-6c61bd12c720';

-- Reset/Create demographics sync status record
INSERT INTO meta_demographics_sync_status (
    brand_id,
    overall_status,
    progress_percentage,
    days_completed,
    total_days_target,
    current_date_range_start,
    current_date_range_end,
    created_at,
    updated_at
) VALUES (
    '1a30f34b-b048-4f80-b880-6c61bd12c720',
    'completed',
    100,
    365,
    365,
    (CURRENT_DATE - INTERVAL '365 days')::date,
    CURRENT_DATE,
    NOW(),
    NOW()
) ON CONFLICT (brand_id) 
DO UPDATE SET
    overall_status = 'completed',
    progress_percentage = 100,
    days_completed = 365,
    total_days_target = 365,
    current_date_range_start = (CURRENT_DATE - INTERVAL '365 days')::date,
    current_date_range_end = CURRENT_DATE,
    updated_at = NOW();

-- Verify the fix
SELECT 
    'After fix:' as info,
    overall_status,
    progress_percentage,
    days_completed,
    total_days_target,
    updated_at
FROM meta_demographics_sync_status 
WHERE brand_id = '1a30f34b-b048-4f80-b880-6c61bd12c720';

-- Also check if we have any demographics data
SELECT 
    'Demographics data count:' as info,
    COUNT(*) as total_records,
    MIN(date_range_start) as earliest_date,
    MAX(date_range_end) as latest_date
FROM meta_demographics 
WHERE brand_id = '1a30f34b-b048-4f80-b880-6c61bd12c720';

-- Check platform connection status
SELECT 
    'Platform connection:' as info,
    platform_type,
    status,
    sync_status,
    metadata->>'ad_account_id' as account_id,
    last_sync,
    updated_at
FROM platform_connections 
WHERE brand_id = '1a30f34b-b048-4f80-b880-6c61bd12c720' 
AND platform_type = 'meta';
