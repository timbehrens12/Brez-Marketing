-- Make brand_id nullable in ai_usage_tracking table
-- This allows tracking usage for features that aren't brand-specific (like outreach messages)

ALTER TABLE ai_usage_tracking 
ALTER COLUMN brand_id DROP NOT NULL;

-- Add index for user_id + feature_type lookups (if not exists)
CREATE INDEX IF NOT EXISTS idx_ai_usage_tracking_user_feature 
ON ai_usage_tracking(user_id, feature_type);

