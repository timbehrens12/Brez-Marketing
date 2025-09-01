-- Create action_recommendations_cache table
CREATE TABLE IF NOT EXISTS action_recommendations_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  date DATE NOT NULL,
  recommendations JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Add RLS policy
ALTER TABLE action_recommendations_cache ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own cached recommendations
CREATE POLICY "Users can access own action recommendations cache" ON action_recommendations_cache
  FOR ALL USING (user_id = auth.uid()::text);

-- Add index for performance
CREATE INDEX idx_action_recommendations_cache_user_date ON action_recommendations_cache(user_id, date);

-- Add cleanup policy to automatically delete old cache entries (older than 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_action_recommendations() 
RETURNS void AS $$
BEGIN
  DELETE FROM action_recommendations_cache 
  WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup to run daily (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-action-recommendations', '0 2 * * *', 'SELECT cleanup_old_action_recommendations();'); 