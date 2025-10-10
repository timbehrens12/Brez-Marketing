-- Add monthly usage tracking columns to ai_usage_tracking table
-- This supports the change from weekly to monthly resets for creative generation, lead generation, and outreach messages
-- Migration applied: 2025-01-10

-- Add monthly usage tracking columns
ALTER TABLE ai_usage_tracking 
ADD COLUMN IF NOT EXISTS monthly_usage_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS monthly_usage_month DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE)::DATE;

-- Add comments to explain the monthly tracking
COMMENT ON COLUMN ai_usage_tracking.monthly_usage_count IS 'Monthly usage count for features that reset on the 1st of each month (creative_generation, lead_gen_enrichment, lead_gen_ecommerce, outreach_messages)';
COMMENT ON COLUMN ai_usage_tracking.monthly_usage_month IS 'The month (YYYY-MM-01) for tracking monthly usage';

-- Create an index for efficient monthly usage queries
CREATE INDEX IF NOT EXISTS idx_ai_usage_tracking_monthly 
ON ai_usage_tracking(user_id, feature_type, monthly_usage_month);

-- Note: The backend service (AIUsageService) now handles monthly resets automatically
-- When checking usage, it compares monthly_usage_month with the current month
-- If different, it resets monthly_usage_count to 0 and updates monthly_usage_month

