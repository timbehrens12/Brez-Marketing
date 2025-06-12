-- Create user usage tracking table for production-ready lead generation limits
CREATE TABLE IF NOT EXISTS user_usage_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  action_type TEXT NOT NULL DEFAULT 'lead_generation',
  count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reset_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_user_action UNIQUE(user_id, action_type)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_usage_tracking_user_id ON user_usage_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_user_usage_tracking_action_type ON user_usage_tracking(action_type);
CREATE INDEX IF NOT EXISTS idx_user_usage_tracking_reset_date ON user_usage_tracking(reset_date);

-- Add comment to explain purpose of the table
COMMENT ON TABLE user_usage_tracking IS 'Tracks user usage limits and resets for various actions like lead generation. Usage is tied to authenticated user, not brand selection.';

-- Auto-cleanup function to remove old reset data
CREATE OR REPLACE FUNCTION cleanup_old_usage_tracking() RETURNS TRIGGER AS $$
BEGIN
  -- Delete records older than 30 days where count is 0 (reset records)
  DELETE FROM user_usage_tracking
  WHERE reset_date < NOW() - INTERVAL '30 days' 
    AND count = 0;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-cleanup old data
DROP TRIGGER IF EXISTS trigger_cleanup_usage_tracking ON user_usage_tracking;
CREATE TRIGGER trigger_cleanup_usage_tracking
AFTER INSERT ON user_usage_tracking
FOR EACH STATEMENT
EXECUTE FUNCTION cleanup_old_usage_tracking(); 