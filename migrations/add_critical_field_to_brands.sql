-- Add critical field to brands table
-- This field will mark brands as critical for monitoring

ALTER TABLE brands 
ADD COLUMN IF NOT EXISTS is_critical boolean DEFAULT false;

-- Add index for efficient queries
CREATE INDEX IF NOT EXISTS idx_brands_is_critical ON brands(is_critical);

-- Add comment for documentation
COMMENT ON COLUMN brands.is_critical IS 'Marks brands as critical for monitoring and prioritization';

-- Update a few sample brands to be critical (optional - for testing)
-- You can remove this section or modify based on your needs
-- UPDATE brands SET is_critical = true WHERE name ILIKE '%test%' OR name ILIKE '%important%';
