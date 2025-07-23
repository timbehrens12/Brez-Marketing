-- Create table for tracking outreach message generation usage
-- This helps prevent API abuse and track costs

CREATE TABLE IF NOT EXISTS outreach_message_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  lead_id TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('email', 'phone', 'linkedin', 'instagram', 'facebook', 'sms')),
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  estimated_cost DECIMAL(6,4) DEFAULT 0.02,
  ai_generated BOOLEAN DEFAULT TRUE
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_outreach_usage_user_id ON outreach_message_usage (user_id);
CREATE INDEX IF NOT EXISTS idx_outreach_usage_generated_at ON outreach_message_usage (generated_at);
CREATE INDEX IF NOT EXISTS idx_outreach_usage_user_time ON outreach_message_usage (user_id, generated_at);
CREATE INDEX IF NOT EXISTS idx_outreach_usage_lead_id ON outreach_message_usage (lead_id);

-- Enable RLS (Row Level Security)
ALTER TABLE outreach_message_usage ENABLE ROW LEVEL SECURITY;

-- Create RLS policy so users can only see their own usage
CREATE POLICY "Users can view own usage" ON outreach_message_usage
  FOR SELECT USING (auth.uid()::text = user_id);

-- Create RLS policy for inserting usage records
CREATE POLICY "Users can insert own usage" ON outreach_message_usage
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Grant permissions
GRANT ALL ON outreach_message_usage TO authenticated;
GRANT ALL ON outreach_message_usage TO service_role; 