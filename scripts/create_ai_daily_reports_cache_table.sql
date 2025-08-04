-- Create ai_daily_reports_cache table for caching daily reports
CREATE TABLE IF NOT EXISTS ai_daily_reports_cache (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    brand_id UUID NOT NULL,
    user_id TEXT NOT NULL,
    report_data JSONB NOT NULL,
    data_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Create unique constraint on brand_id and user_id to prevent duplicates
    CONSTRAINT unique_brand_user_report UNIQUE (brand_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ai_daily_reports_cache_brand_user ON ai_daily_reports_cache(brand_id, user_id);
CREATE INDEX IF NOT EXISTS idx_ai_daily_reports_cache_data_hash ON ai_daily_reports_cache(data_hash);
CREATE INDEX IF NOT EXISTS idx_ai_daily_reports_cache_created_at ON ai_daily_reports_cache(created_at);

-- Add RLS (Row Level Security) if needed
ALTER TABLE ai_daily_reports_cache ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to only access their own reports
CREATE POLICY IF NOT EXISTS "Users can only access their own daily reports"
    ON ai_daily_reports_cache
    FOR ALL
    USING (user_id = auth.uid()::text);

-- Grant necessary permissions
GRANT ALL ON ai_daily_reports_cache TO authenticated;
GRANT ALL ON ai_daily_reports_cache TO service_role;

-- Add comment to table
COMMENT ON TABLE ai_daily_reports_cache IS 'Cache table for AI-generated daily reports to prevent unnecessary API calls when data hasn''t changed'; 