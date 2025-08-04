-- Add snapshot_time column to ai_marketing_reports table
-- This supports the new time picker system with 2 configurable snapshot times per day

ALTER TABLE ai_marketing_reports 
ADD COLUMN IF NOT EXISTS snapshot_time TIME;

-- Create an index for query performance on snapshot_time
CREATE INDEX IF NOT EXISTS idx_ai_marketing_reports_snapshot_time 
ON ai_marketing_reports(snapshot_time);

-- Create a composite index for common queries (brand_id, date_range_from, snapshot_time)
CREATE INDEX IF NOT EXISTS idx_ai_marketing_reports_brand_date_snapshot 
ON ai_marketing_reports(brand_id, date_range_from, snapshot_time);

-- Add comment explaining the column
COMMENT ON COLUMN ai_marketing_reports.snapshot_time IS 'Time of day when the snapshot was taken (HH:MM format)';

-- Update table comment
COMMENT ON TABLE ai_marketing_reports IS 'Stores AI-generated marketing reports and analysis with snapshot times for multiple daily reports'; 