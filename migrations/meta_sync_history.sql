-- This migration adds a table to track Meta API sync history
-- This helps us track rate limits and monitor sync status

-- Create the meta_sync_history table if it doesn't exist
CREATE TABLE IF NOT EXISTS meta_sync_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  date_from DATE NOT NULL,
  date_to DATE NOT NULL,
  record_count INTEGER DEFAULT 0,
  was_rate_limited BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS meta_sync_history_brand_id ON meta_sync_history (brand_id);
CREATE INDEX IF NOT EXISTS meta_sync_history_synced_at ON meta_sync_history (synced_at);

-- Add a function to clean up old sync history records
-- This keeps the table from growing too large
CREATE OR REPLACE FUNCTION cleanup_meta_sync_history() RETURNS TRIGGER AS $$
BEGIN
  -- Delete records older than 30 days
  DELETE FROM meta_sync_history
  WHERE synced_at < NOW() - INTERVAL '30 days';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically clean up old records
DROP TRIGGER IF EXISTS trigger_cleanup_meta_sync_history ON meta_sync_history;
CREATE TRIGGER trigger_cleanup_meta_sync_history
AFTER INSERT ON meta_sync_history
FOR EACH STATEMENT
EXECUTE FUNCTION cleanup_meta_sync_history();

-- Add a comment to the table for documentation
COMMENT ON TABLE meta_sync_history IS 'Tracks Meta API sync operations to help monitor rate limits and sync status'; 