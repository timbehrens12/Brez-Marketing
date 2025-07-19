-- Create campaign daily insights table if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'meta_campaign_daily_insights') THEN
    CREATE TABLE public.meta_campaign_daily_insights (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
      campaign_id TEXT NOT NULL,
      date DATE NOT NULL,
      spent DECIMAL DEFAULT 0,
      impressions INTEGER DEFAULT 0,
      clicks INTEGER DEFAULT 0,
      conversions INTEGER DEFAULT 0,
      ctr DECIMAL DEFAULT 0,
      cpc DECIMAL DEFAULT 0,
      cost_per_conversion DECIMAL DEFAULT 0,
      reach INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      
      -- Add unique constraint on campaign_id + date to avoid duplicates
      CONSTRAINT unique_campaign_date UNIQUE (campaign_id, date)
    );

    -- Create indexes for better query performance
    CREATE INDEX idx_campaign_insights_brand_id ON public.meta_campaign_daily_insights(brand_id);
    CREATE INDEX idx_campaign_insights_campaign_id ON public.meta_campaign_daily_insights(campaign_id);
    CREATE INDEX idx_campaign_insights_date ON public.meta_campaign_daily_insights(date);

    -- Add comment to table
    COMMENT ON TABLE public.meta_campaign_daily_insights IS 'Stores daily performance metrics for Meta campaigns';
  ELSE
    RAISE NOTICE 'Table public.meta_campaign_daily_insights already exists, skipping creation';
  END IF;
END $$;

-- Create timestamp update function
CREATE OR REPLACE FUNCTION update_campaign_insights_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating timestamp
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'meta_campaign_daily_insights') 
  AND NOT EXISTS (SELECT FROM pg_trigger WHERE tgname = 'update_campaign_insights_timestamp') THEN
    CREATE TRIGGER update_campaign_insights_timestamp
    BEFORE UPDATE ON public.meta_campaign_daily_insights
    FOR EACH ROW
    EXECUTE FUNCTION update_campaign_insights_timestamp();
    
    RAISE NOTICE 'Created update_campaign_insights_timestamp trigger';
  END IF;
END $$;

-- Function to get campaign insights by date range
CREATE OR REPLACE FUNCTION get_campaign_insights_by_date_range(
  brand_uuid UUID, 
  p_from_date DATE, 
  p_to_date DATE
) 
RETURNS TABLE (
  campaign_id TEXT,
  campaign_name TEXT,
  status TEXT,
  objective TEXT,
  budget DECIMAL,
  budget_type TEXT,
  spent DECIMAL,
  impressions INTEGER,
  clicks INTEGER,
  conversions INTEGER,
  reach INTEGER,
  ctr DECIMAL,
  cpc DECIMAL,
  cost_per_conversion DECIMAL,
  roas DECIMAL,
  daily_insights JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.campaign_id,
    c.campaign_name,
    c.status,
    c.objective,
    c.budget,
    c.budget_type,
    COALESCE(SUM(i.spent), 0) as spent,
    COALESCE(SUM(i.impressions), 0) as impressions,
    COALESCE(SUM(i.clicks), 0) as clicks,
    COALESCE(SUM(i.conversions), 0) as conversions,
    COALESCE(SUM(i.reach), 0) as reach,
    CASE 
      WHEN COALESCE(SUM(i.impressions), 0) > 0 THEN 
        COALESCE(SUM(i.clicks), 0)::DECIMAL / COALESCE(SUM(i.impressions), 0) 
      ELSE 0 
    END as ctr,
    CASE 
      WHEN COALESCE(SUM(i.clicks), 0) > 0 THEN 
        COALESCE(SUM(i.spent), 0) / COALESCE(SUM(i.clicks), 0) 
      ELSE 0 
    END as cpc,
    CASE 
      WHEN COALESCE(SUM(i.conversions), 0) > 0 THEN 
        COALESCE(SUM(i.spent), 0) / COALESCE(SUM(i.conversions), 0) 
      ELSE 0 
    END as cost_per_conversion,
    0 as roas, -- Add ROAS calculation if available
    (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'date', daily.date,
          'spent', daily.spent,
          'impressions', daily.impressions,
          'clicks', daily.clicks,
          'conversions', daily.conversions,
          'reach', daily.reach,
          'ctr', daily.ctr,
          'cpc', daily.cpc,
          'cost_per_conversion', daily.cost_per_conversion
        )
      ), '[]'::jsonb)
      FROM (
        SELECT 
          i.date,
          i.spent,
          i.impressions,
          i.clicks,
          i.conversions,
          i.reach,
          i.ctr,
          i.cpc,
          i.cost_per_conversion
        FROM public.meta_campaign_daily_insights i
        WHERE i.campaign_id = c.campaign_id
        AND i.date BETWEEN p_from_date AND p_to_date
        ORDER BY i.date DESC
      ) as daily
    ) as daily_insights
  FROM public.meta_campaigns c
  LEFT JOIN public.meta_campaign_daily_insights i 
    ON c.campaign_id = i.campaign_id 
    AND i.date BETWEEN p_from_date AND p_to_date
  WHERE c.brand_id = brand_uuid
  GROUP BY 
    c.campaign_id, 
    c.campaign_name, 
    c.status,
    c.objective,
    c.budget,
    c.budget_type;
END;
$$ LANGUAGE plpgsql;

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meta_campaign_daily_insights TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meta_campaign_daily_insights TO service_role;
GRANT EXECUTE ON FUNCTION get_campaign_insights_by_date_range TO authenticated;
GRANT EXECUTE ON FUNCTION get_campaign_insights_by_date_range TO service_role;

-- Display success notification
DO $$
BEGIN
  RAISE NOTICE 'Created get_campaign_insights_by_date_range function successfully';
END $$; 