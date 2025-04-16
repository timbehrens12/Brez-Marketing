-- Create meta_ads table to store individual ads data from Meta

-- First check if the table already exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'meta_ads') THEN
    CREATE TABLE public.meta_ads (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
      ad_id TEXT NOT NULL,
      ad_name TEXT NOT NULL,
      adset_id TEXT NOT NULL,
      campaign_id TEXT NOT NULL,
      status TEXT,
      creative_id TEXT,
      effective_status TEXT,
      preview_url TEXT,
      thumbnail_url TEXT,
      image_url TEXT,
      headline TEXT,
      body TEXT,
      cta_type TEXT,
      link_url TEXT,
      spent DECIMAL DEFAULT 0,
      impressions INTEGER DEFAULT 0,
      clicks INTEGER DEFAULT 0,
      reach INTEGER DEFAULT 0,
      ctr DECIMAL DEFAULT 0,
      cpc DECIMAL DEFAULT 0,
      conversions INTEGER DEFAULT 0,
      cost_per_conversion DECIMAL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      last_refresh_date TIMESTAMPTZ DEFAULT NOW(),
      
      -- Add unique constraint on ad_id
      CONSTRAINT unique_meta_ad_id UNIQUE (ad_id)
    );

    -- Create indexes for better query performance
    CREATE INDEX idx_meta_ads_brand_id ON public.meta_ads(brand_id);
    CREATE INDEX idx_meta_ads_adset_id ON public.meta_ads(adset_id);
    CREATE INDEX idx_meta_ads_campaign_id ON public.meta_ads(campaign_id);
    CREATE INDEX idx_meta_ads_status ON public.meta_ads(status);

    -- Add comment to table
    COMMENT ON TABLE public.meta_ads IS 'Stores Meta individual ads data, including creative details and performance metrics';
  ELSE
    RAISE NOTICE 'Table public.meta_ads already exists, skipping creation';
  END IF;
END $$;

-- Create timestamp update function
CREATE OR REPLACE FUNCTION update_meta_ads_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating timestamp (using DO block for conditional creation)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'meta_ads') 
  AND NOT EXISTS (SELECT FROM pg_trigger WHERE tgname = 'update_meta_ads_timestamp') THEN
    CREATE TRIGGER update_meta_ads_timestamp
    BEFORE UPDATE ON public.meta_ads
    FOR EACH ROW
    EXECUTE FUNCTION update_meta_ads_timestamp();
    
    RAISE NOTICE 'Created update_meta_ads_timestamp trigger';
  END IF;
END $$;

-- Create function to create meta_ads table via RPC
CREATE OR REPLACE FUNCTION create_meta_ads_table()
RETURNS BOOLEAN AS $$
DECLARE
  table_exists BOOLEAN;
BEGIN
  -- Check if table exists
  SELECT EXISTS (
    SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'meta_ads'
  ) INTO table_exists;
  
  IF NOT table_exists THEN
    -- Create the table if it doesn't exist
    EXECUTE '
      CREATE TABLE public.meta_ads (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
        ad_id TEXT NOT NULL,
        ad_name TEXT NOT NULL,
        adset_id TEXT NOT NULL,
        campaign_id TEXT NOT NULL,
        status TEXT,
        creative_id TEXT,
        effective_status TEXT,
        preview_url TEXT,
        thumbnail_url TEXT,
        image_url TEXT,
        headline TEXT,
        body TEXT,
        cta_type TEXT,
        link_url TEXT,
        spent DECIMAL DEFAULT 0,
        impressions INTEGER DEFAULT 0,
        clicks INTEGER DEFAULT 0,
        reach INTEGER DEFAULT 0,
        ctr DECIMAL DEFAULT 0,
        cpc DECIMAL DEFAULT 0,
        conversions INTEGER DEFAULT 0,
        cost_per_conversion DECIMAL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        last_refresh_date TIMESTAMPTZ DEFAULT NOW(),
        
        -- Add unique constraint on ad_id
        CONSTRAINT unique_meta_ad_id UNIQUE (ad_id)
      );
    ';
    
    -- Create indexes
    EXECUTE 'CREATE INDEX idx_meta_ads_brand_id ON public.meta_ads(brand_id);';
    EXECUTE 'CREATE INDEX idx_meta_ads_adset_id ON public.meta_ads(adset_id);';
    EXECUTE 'CREATE INDEX idx_meta_ads_campaign_id ON public.meta_ads(campaign_id);';
    EXECUTE 'CREATE INDEX idx_meta_ads_status ON public.meta_ads(status);';
    
    -- Create trigger 
    EXECUTE 'CREATE TRIGGER update_meta_ads_timestamp
             BEFORE UPDATE ON public.meta_ads
             FOR EACH ROW
             EXECUTE FUNCTION update_meta_ads_timestamp();';
    
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meta_ads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meta_ads TO service_role;
GRANT EXECUTE ON FUNCTION create_meta_ads_table() TO authenticated;
GRANT EXECUTE ON FUNCTION create_meta_ads_table() TO service_role;

-- Display success notification
DO $$
BEGIN
  RAISE NOTICE 'Meta ads table and functions created successfully.';
END $$; 