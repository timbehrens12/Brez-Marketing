-- Create meta_adset_daily_insights table to store daily performance data for ad sets

-- First check if the table already exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'meta_adset_daily_insights') THEN
    CREATE TABLE public.meta_adset_daily_insights (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
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
      
      -- Add unique constraint on adset_id + date to avoid duplicates
      CONSTRAINT unique_adset_date UNIQUE (adset_id, date)
    );

    -- Create indexes for better query performance
    CREATE INDEX idx_adset_insights_brand_id ON public.meta_adset_daily_insights(brand_id);
    CREATE INDEX idx_adset_insights_adset_id ON public.meta_adset_daily_insights(adset_id);
    CREATE INDEX idx_adset_insights_date ON public.meta_adset_daily_insights(date);

    -- Add comment to table
    COMMENT ON TABLE public.meta_adset_daily_insights IS 'Stores daily performance metrics for Meta ad sets';
  ELSE
    RAISE NOTICE 'Table public.meta_adset_daily_insights already exists, skipping creation';
  END IF;
END $$;

-- Create timestamp update function
CREATE OR REPLACE FUNCTION update_adset_insights_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating timestamp (using DO block for conditional creation)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'meta_adset_daily_insights') 
  AND NOT EXISTS (SELECT FROM pg_trigger WHERE tgname = 'update_adset_insights_timestamp') THEN
    CREATE TRIGGER update_adset_insights_timestamp
    BEFORE UPDATE ON public.meta_adset_daily_insights
    FOR EACH ROW
    EXECUTE FUNCTION update_adset_insights_timestamp();
    
    RAISE NOTICE 'Created update_adset_insights_timestamp trigger';
  END IF;
END $$;

-- Function to get ad set insights by date range
CREATE OR REPLACE FUNCTION get_adset_insights_by_date_range(
  brand_uuid UUID, 
  p_from_date DATE, 
  p_to_date DATE
) 
RETURNS TABLE (
  adset_id TEXT,
  adset_name TEXT,
  campaign_id TEXT,
  status TEXT,
  budget DECIMAL,
  budget_type TEXT,
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
    a.adset_id,
    a.adset_name,
    a.campaign_id,
    a.status,
    a.budget,
    a.budget_type,
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
        FROM public.meta_adset_daily_insights i
        WHERE i.adset_id = a.adset_id
        AND i.date BETWEEN p_from_date AND p_to_date
        ORDER BY i.date DESC
      ) as daily
    ) as daily_insights
  FROM public.meta_adsets a
  LEFT JOIN public.meta_adset_daily_insights i 
    ON a.adset_id = i.adset_id 
    AND i.date BETWEEN p_from_date AND p_to_date
  WHERE a.brand_id = brand_uuid
  GROUP BY 
    a.adset_id, 
    a.adset_name, 
    a.campaign_id, 
    a.status, 
    a.budget, 
    a.budget_type;
END;
$$ LANGUAGE plpgsql;

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meta_adset_daily_insights TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meta_adset_daily_insights TO service_role;
GRANT EXECUTE ON FUNCTION get_adset_insights_by_date_range TO authenticated;
GRANT EXECUTE ON FUNCTION get_adset_insights_by_date_range TO service_role;

-- Display success notification
DO $$
BEGIN
  RAISE NOTICE 'Ad set daily insights table and functions created successfully.';
END $$; 