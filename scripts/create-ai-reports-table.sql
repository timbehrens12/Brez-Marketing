-- SQL script to create the ai_reports table and indexes
-- Run this script in your Supabase SQL editor

-- Create the ai_reports table if it doesn't exist
CREATE TABLE IF NOT EXISTS ai_reports (
  id SERIAL PRIMARY KEY,
  brand_id UUID NOT NULL,
  user_id TEXT,  -- User ID can be null for anonymous reports
  report_type TEXT,
  period TEXT,
  report_content TEXT,
  metrics_data JSONB DEFAULT '{}'::jsonb,
  comparison_data JSONB DEFAULT '{}'::jsonb,
  best_selling_products JSONB DEFAULT '[]'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,
  daily_report TEXT,
  daily_updated_at TIMESTAMP WITH TIME ZONE,
  daily_recommendations JSONB DEFAULT '[]'::jsonb,
  monthly_report TEXT,
  monthly_updated_at TIMESTAMP WITH TIME ZONE,
  monthly_recommendations JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE ai_reports IS 'Stores AI-generated reports and analysis';
COMMENT ON COLUMN ai_reports.brand_id IS 'Reference to the brand ID';
COMMENT ON COLUMN ai_reports.user_id IS 'Reference to the user who generated the report (can be null for anonymous reports)';
COMMENT ON COLUMN ai_reports.report_type IS 'Type of report (summary, comprehensive, basic)';
COMMENT ON COLUMN ai_reports.period IS 'Time period for the report (daily, weekly, monthly, etc.)';
COMMENT ON COLUMN ai_reports.report_content IS 'The AI-generated report content';
COMMENT ON COLUMN ai_reports.metrics_data IS 'Metrics data used to generate the report';
COMMENT ON COLUMN ai_reports.comparison_data IS 'Comparison data used to generate the report';
COMMENT ON COLUMN ai_reports.best_selling_products IS 'Best-selling products data';
COMMENT ON COLUMN ai_reports.recommendations IS 'AI-generated recommendations';
COMMENT ON COLUMN ai_reports.daily_report IS 'Legacy daily report content';
COMMENT ON COLUMN ai_reports.monthly_report IS 'Legacy monthly report content';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS ai_reports_brand_id_idx ON ai_reports(brand_id);
CREATE INDEX IF NOT EXISTS ai_reports_user_id_idx ON ai_reports(user_id);
CREATE INDEX IF NOT EXISTS ai_reports_created_at_idx ON ai_reports(created_at);
CREATE INDEX IF NOT EXISTS ai_reports_period_idx ON ai_reports(period);
CREATE INDEX IF NOT EXISTS ai_reports_report_type_idx ON ai_reports(report_type);

-- Grant necessary permissions (adjust if needed for your Supabase setup)
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_reports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_reports TO service_role;
GRANT USAGE ON SEQUENCE ai_reports_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE ai_reports_id_seq TO service_role;

-- If the table already exists with NOT NULL constraints, run these to remove them:
ALTER TABLE IF EXISTS ai_reports ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE IF EXISTS ai_reports ALTER COLUMN report_type DROP NOT NULL;
ALTER TABLE IF EXISTS ai_reports ALTER COLUMN period DROP NOT NULL;
ALTER TABLE IF EXISTS ai_reports ALTER COLUMN report_content DROP NOT NULL; 