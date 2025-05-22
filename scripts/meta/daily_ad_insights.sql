-- Create meta_ad_daily_insights table to store daily performance data for individual ads

-- First check if the table already exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'meta_ad_daily_insights') THEN
    CREATE TABLE public.meta_ad_daily_insights (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
      ad_id TEXT NOT NULL,
      adset_id TEXT NOT NULL,
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
      
      -- Add unique constraint on ad_id + date to avoid duplicates
      CONSTRAINT unique_ad_date UNIQUE (ad_id, date)
    );

    -- Create indexes for better query performance
    CREATE INDEX idx_ad_insights_brand_id ON public.meta_ad_daily_insights(brand_id);
    CREATE INDEX idx_ad_insights_ad_id ON public.meta_ad_daily_insights(ad_id);
    CREATE INDEX idx_ad_insights_adset_id ON public.meta_ad_daily_insights(adset_id);
    CREATE INDEX idx_ad_insights_date ON public.meta_ad_daily_insights(date);

    -- Add comment to table
    COMMENT ON TABLE public.meta_ad_daily_insights IS 'Stores daily performance metrics for individual Meta ads';
  ELSE
    RAISE NOTICE 'Table public.meta_ad_daily_insights already exists, skipping creation';
  END IF;
END $$;

-- Create timestamp update function
CREATE OR REPLACE FUNCTION update_ad_insights_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating timestamp (using DO block for conditional creation)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'meta_ad_daily_insights') 
  AND NOT EXISTS (SELECT FROM pg_trigger WHERE tgname = 'update_ad_insights_timestamp') THEN
    CREATE TRIGGER update_ad_insights_timestamp
    BEFORE UPDATE ON public.meta_ad_daily_insights
    FOR EACH ROW
    EXECUTE FUNCTION update_ad_insights_timestamp();
    
    RAISE NOTICE 'Created update_ad_insights_timestamp trigger';
  END IF;
END $$;

-- Function to get ad insights by date range
CREATE OR REPLACE FUNCTION get_ad_insights_by_date_range(
  brand_uuid UUID, 
  p_from_date DATE, 
  p_to_date DATE,
  p_adset_id TEXT DEFAULT NULL
) 
RETURNS TABLE (
  ad_id TEXT,
  ad_name TEXT,
  adset_id TEXT,
  campaign_id TEXT,
  status TEXT,
  creative_id TEXT,
  effective_status TEXT,
  preview_url TEXT,
  thumbnail_url TEXT,
  spent DECIMAL,
  impressions INTEGER,
  clicks INTEGER,
  conversions INTEGER,
  ctr DECIMAL,
  cpc DECIMAL,
  cost_per_conversion DECIMAL,
  daily_insights JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.ad_id,
    a.ad_name,
    a.adset_id,
    a.campaign_id,
    a.status,
    a.creative_id,
    a.effective_status,
    a.preview_url,
    a.thumbnail_url,
    COALESCE(SUM(i.spent), 0) as spent,
    COALESCE(SUM(i.impressions), 0) as impressions,
    COALESCE(SUM(i.clicks), 0) as clicks,
    COALESCE(SUM(i.conversions), 0) as conversions,
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
    (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'date', daily.date,
          'spent', daily.spent,
          'impressions', daily.impressions,
          'clicks', daily.clicks,
          'conversions', daily.conversions,
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
          i.ctr,
          i.cpc,
          i.cost_per_conversion
        FROM public.meta_ad_daily_insights i
        WHERE i.ad_id = a.ad_id
        AND i.date BETWEEN p_from_date AND p_to_date
        ORDER BY i.date DESC
      ) as daily
    ) as daily_insights
  FROM public.meta_ads a
  LEFT JOIN public.meta_ad_daily_insights i 
    ON a.ad_id = i.ad_id 
    AND i.date BETWEEN p_from_date AND p_to_date
  WHERE a.brand_id = brand_uuid
    AND (p_adset_id IS NULL OR a.adset_id = p_adset_id)
  GROUP BY 
    a.ad_id, 
    a.ad_name, 
    a.adset_id, 
    a.campaign_id, 
    a.status, 
    a.creative_id,
    a.effective_status,
    a.preview_url,
    a.thumbnail_url;
END;
$$ LANGUAGE plpgsql;

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meta_ad_daily_insights TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meta_ad_daily_insights TO service_role;
GRANT EXECUTE ON FUNCTION get_ad_insights_by_date_range TO authenticated;
GRANT EXECUTE ON FUNCTION get_ad_insights_by_date_range TO service_role;

-- Display success notification
DO $$
BEGIN
  RAISE NOTICE 'Ad daily insights table and functions created successfully.';
END $$; 