-- Create meta_campaigns table to store detailed campaign information
CREATE TABLE IF NOT EXISTS public.meta_campaigns (
  id SERIAL PRIMARY KEY,
  brand_id UUID NOT NULL,
  connection_id UUID NOT NULL,
  account_id TEXT NOT NULL,
  account_name TEXT,
  campaign_id TEXT NOT NULL,
  campaign_name TEXT NOT NULL,
  objective TEXT,
  status TEXT,
  budget_type TEXT, -- 'daily' or 'lifetime'
  budget DECIMAL(12,2) DEFAULT 0,
  budget_source TEXT, -- Tracks where the budget value came from (campaign, ad set, etc.)
  spent DECIMAL(12,2) DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0, 
  clicks INTEGER DEFAULT 0,
  ctr DECIMAL(6,2) DEFAULT 0, -- Click-through rate (percentage)
  cpc DECIMAL(10,2) DEFAULT 0, -- Cost per click
  conversions INTEGER DEFAULT 0,
  cost_per_conversion DECIMAL(12,2) DEFAULT 0,
  roas DECIMAL(6,2) DEFAULT 0, -- Return on ad spend
  start_date DATE,
  end_date DATE,
  last_refresh_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_sync_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  -- Add JSON fields for additional campaign details
  targeting JSONB DEFAULT '{}',
  placements JSONB DEFAULT '[]',
  daily_insights JSONB DEFAULT '[]', -- Array of daily performance metrics
  UNIQUE(brand_id, campaign_id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_meta_campaigns_brand_id ON public.meta_campaigns(brand_id);
CREATE INDEX IF NOT EXISTS idx_meta_campaigns_connection_id ON public.meta_campaigns(connection_id);
CREATE INDEX IF NOT EXISTS idx_meta_campaigns_campaign_id ON public.meta_campaigns(campaign_id);
CREATE INDEX IF NOT EXISTS idx_meta_campaigns_status ON public.meta_campaigns(status);

-- Add comments for better documentation
COMMENT ON TABLE public.meta_campaigns IS 'Stores detailed Meta (Facebook/Instagram) campaign information';
COMMENT ON COLUMN public.meta_campaigns.brand_id IS 'Reference to the brand';
COMMENT ON COLUMN public.meta_campaigns.connection_id IS 'Reference to the platform_connections table';
COMMENT ON COLUMN public.meta_campaigns.campaign_id IS 'Meta campaign ID';
COMMENT ON COLUMN public.meta_campaigns.campaign_name IS 'Name of the campaign';
COMMENT ON COLUMN public.meta_campaigns.objective IS 'Campaign objective (e.g., CONVERSIONS, TRAFFIC, etc.)';
COMMENT ON COLUMN public.meta_campaigns.status IS 'Current campaign status (ACTIVE, PAUSED, DELETED, etc.)';
COMMENT ON COLUMN public.meta_campaigns.budget_type IS 'Type of budget (daily or lifetime)';
COMMENT ON COLUMN public.meta_campaigns.budget IS 'Budget amount';
COMMENT ON COLUMN public.meta_campaigns.budget_source IS 'Source of budget info (campaign_daily, adset_daily, etc.)';
COMMENT ON COLUMN public.meta_campaigns.spent IS 'Amount spent on this campaign';
COMMENT ON COLUMN public.meta_campaigns.impressions IS 'Number of impressions';
COMMENT ON COLUMN public.meta_campaigns.reach IS 'Number of unique users reached';
COMMENT ON COLUMN public.meta_campaigns.clicks IS 'Number of clicks';
COMMENT ON COLUMN public.meta_campaigns.ctr IS 'Click-through rate (percentage)';
COMMENT ON COLUMN public.meta_campaigns.cpc IS 'Cost per click';
COMMENT ON COLUMN public.meta_campaigns.conversions IS 'Number of conversions';
COMMENT ON COLUMN public.meta_campaigns.cost_per_conversion IS 'Cost per conversion';
COMMENT ON COLUMN public.meta_campaigns.roas IS 'Return on ad spend (revenue/spend)';
COMMENT ON COLUMN public.meta_campaigns.targeting IS 'JSON data for campaign targeting settings';
COMMENT ON COLUMN public.meta_campaigns.placements IS 'JSON array of placement information';
COMMENT ON COLUMN public.meta_campaigns.daily_insights IS 'JSON array of daily performance metrics';

-- Create a trigger function to auto-update timestamp
CREATE OR REPLACE FUNCTION update_meta_campaigns_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER update_meta_campaigns_timestamp
BEFORE UPDATE ON public.meta_campaigns
FOR EACH ROW
EXECUTE FUNCTION update_meta_campaigns_timestamp();

-- Create a trigger function to calculate derived metrics
CREATE OR REPLACE FUNCTION calculate_meta_campaign_metrics()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate CTR
  IF NEW.impressions > 0 AND NEW.clicks > 0 THEN
    NEW.ctr := (NEW.clicks::NUMERIC / NEW.impressions::NUMERIC) * 100;
  ELSE
    NEW.ctr := 0;
  END IF;
  
  -- Calculate CPC
  IF NEW.clicks > 0 AND NEW.spent > 0 THEN
    NEW.cpc := NEW.spent / NEW.clicks;
  ELSE
    NEW.cpc := 0;
  END IF;
  
  -- Calculate cost per conversion
  IF NEW.conversions > 0 AND NEW.spent > 0 THEN
    NEW.cost_per_conversion := NEW.spent / NEW.conversions;
  ELSE
    NEW.cost_per_conversion := 0;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER calculate_meta_campaign_metrics
BEFORE INSERT OR UPDATE OF impressions, clicks, spent, conversions
ON public.meta_campaigns
FOR EACH ROW
EXECUTE FUNCTION calculate_meta_campaign_metrics();

-- Enable row level security
ALTER TABLE public.meta_campaigns ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'meta_campaigns' 
    AND policyname = 'Allow authenticated users to access meta_campaigns'
  ) THEN
    CREATE POLICY "Allow authenticated users to access meta_campaigns"
    ON public.meta_campaigns
    FOR ALL
    TO authenticated
    USING (true);
  END IF;
END
$$;

-- Add permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meta_campaigns TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meta_campaigns TO service_role;
GRANT USAGE ON SEQUENCE meta_campaigns_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE meta_campaigns_id_seq TO service_role; 