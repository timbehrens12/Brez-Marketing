-- SQL script to create the meta_ad_insights table and indexes
-- Run this script in your Supabase SQL editor if you're missing the table

-- Drop the table if it exists (CAREFUL: This will delete all existing data!)
-- DROP TABLE IF EXISTS meta_ad_insights;

-- Create the meta_ad_insights table
CREATE TABLE IF NOT EXISTS meta_ad_insights (
  id SERIAL PRIMARY KEY,
  brand_id UUID NOT NULL,
  connection_id UUID NOT NULL,
  account_id VARCHAR NOT NULL,
  account_name VARCHAR,
  campaign_id VARCHAR NOT NULL,
  campaign_name VARCHAR,
  adset_id VARCHAR,
  adset_name VARCHAR,
  ad_id VARCHAR,
  ad_name VARCHAR,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  spend DECIMAL(12,2) DEFAULT 0,
  date DATE NOT NULL,
  actions JSONB DEFAULT '[]'::jsonb,
  action_values JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comments to the table and columns for better documentation
COMMENT ON TABLE meta_ad_insights IS 'Stores Meta (Facebook/Instagram) ad campaign insights data';
COMMENT ON COLUMN meta_ad_insights.brand_id IS 'Reference to the brand';
COMMENT ON COLUMN meta_ad_insights.connection_id IS 'Reference to the platform_connections table';
COMMENT ON COLUMN meta_ad_insights.account_id IS 'Meta ad account ID';
COMMENT ON COLUMN meta_ad_insights.campaign_id IS 'Meta campaign ID';
COMMENT ON COLUMN meta_ad_insights.adset_id IS 'Meta ad set ID';
COMMENT ON COLUMN meta_ad_insights.ad_id IS 'Meta ad ID';
COMMENT ON COLUMN meta_ad_insights.impressions IS 'Number of impressions';
COMMENT ON COLUMN meta_ad_insights.clicks IS 'Number of clicks';
COMMENT ON COLUMN meta_ad_insights.spend IS 'Amount spent in USD';
COMMENT ON COLUMN meta_ad_insights.date IS 'Date of the insights data';
COMMENT ON COLUMN meta_ad_insights.actions IS 'JSON array of actions (conversions, etc.)';
COMMENT ON COLUMN meta_ad_insights.action_values IS 'JSON array of action values (conversion values, etc.)';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS meta_ad_insights_brand_id_idx ON meta_ad_insights(brand_id);
CREATE INDEX IF NOT EXISTS meta_ad_insights_connection_id_idx ON meta_ad_insights(connection_id);
CREATE INDEX IF NOT EXISTS meta_ad_insights_date_idx ON meta_ad_insights(date);
CREATE INDEX IF NOT EXISTS meta_ad_insights_campaign_id_idx ON meta_ad_insights(campaign_id);

-- Grant necessary permissions (adjust if needed for your Supabase setup)
GRANT SELECT, INSERT, UPDATE, DELETE ON meta_ad_insights TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON meta_ad_insights TO service_role;
GRANT USAGE ON SEQUENCE meta_ad_insights_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE meta_ad_insights_id_seq TO service_role;

-- Sample query to check if the table was created successfully
-- SELECT COUNT(*) FROM meta_ad_insights; 