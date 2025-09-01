-- Add composite index for brand_id and user_id combination
-- This will significantly improve query performance for the common pattern:
-- WHERE brand_id = ? AND user_id = ? ORDER BY created_at DESC

CREATE INDEX IF NOT EXISTS idx_creative_generations_brand_user_created 
ON creative_generations(brand_id, user_id, created_at DESC);

-- Also add a more specific composite index for the exact query pattern
CREATE INDEX IF NOT EXISTS idx_creative_generations_brand_user 
ON creative_generations(brand_id, user_id);

-- Add comment explaining the indexes
COMMENT ON INDEX idx_creative_generations_brand_user_created IS 'Composite index for brand_id + user_id queries with created_at ordering';
COMMENT ON INDEX idx_creative_generations_brand_user IS 'Composite index for brand_id + user_id filtering';
