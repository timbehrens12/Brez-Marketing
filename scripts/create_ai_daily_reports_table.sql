-- Create ai_daily_reports_cache table for caching AI daily reports
CREATE TABLE IF NOT EXISTS ai_daily_reports_cache (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    report_data JSONB NOT NULL,
    data_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_daily_reports_brand_user ON ai_daily_reports_cache(brand_id, user_id);
CREATE INDEX IF NOT EXISTS idx_ai_daily_reports_created_at ON ai_daily_reports_cache(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_daily_reports_data_hash ON ai_daily_reports_cache(data_hash);

-- Create unique constraint to prevent duplicate entries for same brand/user
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_daily_reports_unique_brand_user 
ON ai_daily_reports_cache(brand_id, user_id);

-- Add RLS policies
ALTER TABLE ai_daily_reports_cache ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own reports
CREATE POLICY "Users can read their own AI daily reports" ON ai_daily_reports_cache
    FOR SELECT
    USING (auth.uid()::text = user_id);

-- Allow users to insert their own reports
CREATE POLICY "Users can insert their own AI daily reports" ON ai_daily_reports_cache
    FOR INSERT
    WITH CHECK (auth.uid()::text = user_id);

-- Allow users to update their own reports
CREATE POLICY "Users can update their own AI daily reports" ON ai_daily_reports_cache
    FOR UPDATE
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);

-- Allow users to delete their own reports
CREATE POLICY "Users can delete their own AI daily reports" ON ai_daily_reports_cache
    FOR DELETE
    USING (auth.uid()::text = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ai_daily_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_ai_daily_reports_updated_at
    BEFORE UPDATE ON ai_daily_reports_cache
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_daily_reports_updated_at();

-- Add helpful comments
COMMENT ON TABLE ai_daily_reports_cache IS 'Stores cached AI-generated daily marketing reports with data hash for change detection';
COMMENT ON COLUMN ai_daily_reports_cache.data_hash IS 'SHA256 hash of key data points to detect when regeneration is needed';
COMMENT ON COLUMN ai_daily_reports_cache.report_data IS 'Complete generated report data in JSON format'; 