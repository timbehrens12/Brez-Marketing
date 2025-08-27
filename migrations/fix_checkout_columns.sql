-- Fix missing checkout_id and city columns
-- Run this in your Supabase SQL editor

-- Add missing checkout_id column to shopify_abandoned_checkouts
ALTER TABLE shopify_abandoned_checkouts 
ADD COLUMN IF NOT EXISTS checkout_id TEXT;

-- Add missing checkout_id column to shopify_checkouts  
ALTER TABLE shopify_checkouts 
ADD COLUMN IF NOT EXISTS checkout_id TEXT;

-- Add missing city column to shopify_abandoned_checkouts
ALTER TABLE shopify_abandoned_checkouts
ADD COLUMN IF NOT EXISTS city TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_shopify_abandoned_checkouts_checkout_id 
ON shopify_abandoned_checkouts(checkout_id);

CREATE INDEX IF NOT EXISTS idx_shopify_checkouts_checkout_id 
ON shopify_checkouts(checkout_id);

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'shopify_abandoned_checkouts' 
AND column_name IN ('checkout_id', 'city');

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'shopify_checkouts' 
AND column_name = 'checkout_id';
