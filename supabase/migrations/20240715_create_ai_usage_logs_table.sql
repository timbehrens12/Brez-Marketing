-- Create the ai_usage_logs table to track AI feature usage
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    brand_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_brand_id ON ai_usage_logs(brand_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_id ON ai_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_endpoint ON ai_usage_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created_at ON ai_usage_logs(created_at);

-- Add RLS policies
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to access their own AI usage logs
CREATE POLICY "Users can access their own AI usage logs" ON ai_usage_logs
    FOR ALL USING (auth.uid()::text = user_id);

-- Create a trigger to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ai_usage_logs_updated_at 
    BEFORE UPDATE ON ai_usage_logs 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column(); 