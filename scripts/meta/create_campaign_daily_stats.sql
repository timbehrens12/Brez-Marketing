-- Create meta_campaign_daily_stats table for daily campaign metrics
CREATE TABLE IF NOT EXISTS meta_campaign_daily_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  campaign_id VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  spend DECIMAL(12,2) DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  ctr DECIMAL(10,4) DEFAULT 0,
  cpc DECIMAL(12,4) DEFAULT 0,
  cost_per_conversion DECIMAL(12,4) DEFAULT 0,
  roas DECIMAL(12,4) DEFAULT 0,
  last_refresh_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Add a composite unique constraint to prevent duplicates
  UNIQUE(campaign_id, date)
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_meta_campaign_daily_stats_brand_id ON meta_campaign_daily_stats(brand_id);
CREATE INDEX IF NOT EXISTS idx_meta_campaign_daily_stats_campaign_id ON meta_campaign_daily_stats(campaign_id);
CREATE INDEX IF NOT EXISTS idx_meta_campaign_daily_stats_date ON meta_campaign_daily_stats(date);
CREATE INDEX IF NOT EXISTS idx_meta_campaign_daily_stats_campaign_date ON meta_campaign_daily_stats(campaign_id, date);

-- Add a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_meta_campaign_daily_stats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add a trigger to automatically update the updated_at timestamp
CREATE TRIGGER update_meta_campaign_daily_stats_updated_at
BEFORE UPDATE ON meta_campaign_daily_stats
FOR EACH ROW
EXECUTE FUNCTION update_meta_campaign_daily_stats_updated_at();

-- Add comment to explain purpose of the table
COMMENT ON TABLE meta_campaign_daily_stats IS 'Stores daily metrics for Meta ad campaigns to support date range filtering'; 