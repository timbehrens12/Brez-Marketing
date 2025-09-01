-- Create the meta_ad_insights table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.meta_ad_insights (
  id SERIAL PRIMARY KEY,
  brand_id UUID NOT NULL,
  connection_id UUID NOT NULL,
  account_id TEXT,
  account_name TEXT,
  campaign_id TEXT,
  campaign_name TEXT,
  adset_id TEXT,
  adset_name TEXT,
  ad_id TEXT,
  ad_name TEXT,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  spend DECIMAL(10, 2) DEFAULT 0,
  date DATE NOT NULL,
  actions JSONB DEFAULT '[]',
  action_values JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_meta_ad_insights_brand_id ON public.meta_ad_insights(brand_id);
CREATE INDEX IF NOT EXISTS idx_meta_ad_insights_connection_id ON public.meta_ad_insights(connection_id);
CREATE INDEX IF NOT EXISTS idx_meta_ad_insights_date ON public.meta_ad_insights(date);

-- Enable row level security
ALTER TABLE public.meta_ad_insights ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (only if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'meta_ad_insights' 
    AND policyname = 'Allow authenticated users to access meta_ad_insights'
  ) THEN
    CREATE POLICY "Allow authenticated users to access meta_ad_insights"
    ON public.meta_ad_insights
    FOR ALL
    TO authenticated
    USING (true);
  END IF;
END
$$; 