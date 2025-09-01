-- Script to clear all data from the meta_data_tracking table
-- This will reset the Meta connection data to ensure fresh data can be retrieved from the API

-- First, let's delete all rows from the meta_data_tracking table
DELETE FROM meta_data_tracking;

-- Log the operation
SELECT 'Cleared all data from meta_data_tracking table' as result;

-- Optional: If you want to reset the data tracking sequence (if any)
-- ALTER SEQUENCE meta_data_tracking_id_seq RESTART WITH 1;

-- Note: This script should be run when you want to reload fresh Meta data
-- It will not affect your Meta connection, only the cached data 