-- Create sync_logs table for tracking Shopify sync processes
CREATE TABLE IF NOT EXISTS sync_logs (
  id SERIAL PRIMARY KEY,
  sync_session_id VARCHAR(50) NOT NULL,
  level VARCHAR(10) NOT NULL, -- INFO, WARN, ERROR
  event VARCHAR(100) NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_sync_logs_session_id ON sync_logs(sync_session_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_created_at ON sync_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_sync_logs_level ON sync_logs(level);

-- Add RLS policies if needed
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read logs
CREATE POLICY "Users can view sync logs" ON sync_logs
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow service role to insert logs
CREATE POLICY "Service role can insert sync logs" ON sync_logs
  FOR INSERT WITH CHECK (true);
