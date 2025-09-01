-- URGENT: Run this SQL in your Supabase SQL Editor to fix missing database columns
-- This will fix the checkout sync errors and database column errors

-- Add missing checkout_id column to shopify_abandoned_checkouts
ALTER TABLE shopify_abandoned_checkouts 
ADD COLUMN IF NOT EXISTS checkout_id TEXT;

-- Add missing checkout_id column to shopify_checkouts  
ALTER TABLE shopify_checkouts 
ADD COLUMN IF NOT EXISTS checkout_id TEXT;

-- Add missing city column to shopify_abandoned_checkouts
ALTER TABLE shopify_abandoned_checkouts
ADD COLUMN IF NOT EXISTS city TEXT;

-- Add missing country column to shopify_abandoned_checkouts
ALTER TABLE shopify_abandoned_checkouts
ADD COLUMN IF NOT EXISTS country TEXT;

-- Add missing city column to shopify_checkouts
ALTER TABLE shopify_checkouts
ADD COLUMN IF NOT EXISTS city TEXT;

-- Add missing country column to shopify_checkouts
ALTER TABLE shopify_checkouts
ADD COLUMN IF NOT EXISTS country TEXT;

-- Add missing country_code column to shopify_abandoned_checkouts
ALTER TABLE shopify_abandoned_checkouts
ADD COLUMN IF NOT EXISTS country_code TEXT;

-- Add missing connection_id column to shopify_checkouts
ALTER TABLE shopify_checkouts
ADD COLUMN IF NOT EXISTS connection_id UUID REFERENCES platform_connections(id);

-- Add missing last_synced_at column to shopify_abandoned_checkouts  
ALTER TABLE shopify_abandoned_checkouts
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_shopify_abandoned_checkouts_checkout_id 
ON shopify_abandoned_checkouts(checkout_id);

CREATE INDEX IF NOT EXISTS idx_shopify_checkouts_checkout_id 
ON shopify_checkouts(checkout_id);

-- Verify the columns were added
SELECT 'shopify_abandoned_checkouts columns:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'shopify_abandoned_checkouts' 
AND column_name IN ('checkout_id', 'city', 'country', 'country_code', 'last_synced_at')
ORDER BY column_name;

SELECT 'shopify_checkouts columns:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'shopify_checkouts' 
AND column_name IN ('checkout_id', 'city', 'country', 'connection_id')
ORDER BY column_name;
