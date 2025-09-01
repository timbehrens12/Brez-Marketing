-- Migration: Add Multi-Brand Sharing Support
-- Run this SQL in your Supabase SQL editor

-- Add support for multi-brand sharing
ALTER TABLE brand_share_links 
ADD COLUMN IF NOT EXISTS brand_ids jsonb,
ADD COLUMN IF NOT EXISTS is_multi_brand boolean DEFAULT false;

-- Create index for brand_ids array queries
CREATE INDEX IF NOT EXISTS idx_brand_share_links_brand_ids ON brand_share_links USING gin(brand_ids);

-- Update existing single brand links to use the new structure
UPDATE brand_share_links 
SET 
  brand_ids = jsonb_build_array(brand_id::text),
  is_multi_brand = false 
WHERE brand_ids IS NULL AND brand_id IS NOT NULL;

-- Make brand_id nullable since we'll use brand_ids for multi-brand
ALTER TABLE brand_share_links ALTER COLUMN brand_id DROP NOT NULL;

-- Add comments for clarity
COMMENT ON COLUMN brand_share_links.brand_ids IS 'JSON array of brand IDs for multi-brand sharing';
COMMENT ON COLUMN brand_share_links.is_multi_brand IS 'True if this link shares multiple brands';

-- Verify the changes
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'brand_share_links' 
  AND column_name IN ('brand_ids', 'is_multi_brand', 'brand_id')
ORDER BY ordinal_position; 