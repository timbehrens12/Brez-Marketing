-- Create meta_adsets table to store ad sets data from Meta

-- First check if the table already exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'meta_adsets') THEN
    CREATE TABLE public.meta_adsets (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
      adset_id TEXT NOT NULL,
      adset_name TEXT NOT NULL,
      campaign_id TEXT NOT NULL,
      status TEXT,
      budget DECIMAL DEFAULT 0,
      budget_type TEXT,
      optimization_goal TEXT,
      bid_strategy TEXT,
      bid_amount DECIMAL DEFAULT 0,
      targeting JSONB,
      start_date TIMESTAMPTZ,
      end_date TIMESTAMPTZ,
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
      
      -- Add unique constraint on adset_id
      CONSTRAINT unique_meta_adset_id UNIQUE (adset_id)
    );

    -- Create indexes for better query performance
    CREATE INDEX idx_meta_adsets_brand_id ON public.meta_adsets(brand_id);
    CREATE INDEX idx_meta_adsets_campaign_id ON public.meta_adsets(campaign_id);
    CREATE INDEX idx_meta_adsets_status ON public.meta_adsets(status);

    -- Add comment to table
    COMMENT ON TABLE public.meta_adsets IS 'Stores Meta ad sets data, including budgets and performance metrics';
  ELSE
    RAISE NOTICE 'Table public.meta_adsets already exists, skipping creation';
  END IF;
END $$;

-- Create timestamp update function (outside of the DO block)
CREATE OR REPLACE FUNCTION update_meta_adsets_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating timestamp (using DO block for conditional creation)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'meta_adsets') 
  AND NOT EXISTS (SELECT FROM pg_trigger WHERE tgname = 'update_meta_adsets_timestamp') THEN
    CREATE TRIGGER update_meta_adsets_timestamp
    BEFORE UPDATE ON public.meta_adsets
    FOR EACH ROW
    EXECUTE FUNCTION update_meta_adsets_timestamp();
    
    RAISE NOTICE 'Created update_meta_adsets_timestamp trigger';
  END IF;
END $$;

-- Add adset_budget_total column to meta_campaigns table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'meta_campaigns' 
    AND column_name = 'adset_budget_total'
  ) THEN
    ALTER TABLE public.meta_campaigns ADD COLUMN adset_budget_total DECIMAL DEFAULT 0;
    COMMENT ON COLUMN public.meta_campaigns.adset_budget_total IS 'Combined budget total from all ad sets in this campaign';
    RAISE NOTICE 'Added adset_budget_total column to meta_campaigns table';
  ELSE 
    RAISE NOTICE 'Column adset_budget_total already exists in meta_campaigns table';
  END IF;
END $$;

-- Create function to create meta_adsets table via RPC
CREATE OR REPLACE FUNCTION create_meta_adsets_table()
RETURNS BOOLEAN AS $$
DECLARE
  table_exists BOOLEAN;
BEGIN
  -- Check if table exists
  SELECT EXISTS (
    SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'meta_adsets'
  ) INTO table_exists;
  
  IF NOT table_exists THEN
    -- Create the table if it doesn't exist
    EXECUTE '
      CREATE TABLE public.meta_adsets (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
        adset_id TEXT NOT NULL,
        adset_name TEXT NOT NULL,
        campaign_id TEXT NOT NULL,
        status TEXT,
        budget DECIMAL DEFAULT 0,
        budget_type TEXT,
        optimization_goal TEXT,
        bid_strategy TEXT,
        bid_amount DECIMAL DEFAULT 0,
        targeting JSONB,
        start_date TIMESTAMPTZ,
        end_date TIMESTAMPTZ,
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
        
        -- Add unique constraint on adset_id
        CONSTRAINT unique_meta_adset_id UNIQUE (adset_id)
      );
    ';
    
    -- Create indexes
    EXECUTE 'CREATE INDEX idx_meta_adsets_brand_id ON public.meta_adsets(brand_id);';
    EXECUTE 'CREATE INDEX idx_meta_adsets_campaign_id ON public.meta_adsets(campaign_id);';
    EXECUTE 'CREATE INDEX idx_meta_adsets_status ON public.meta_adsets(status);';
    
    -- Create trigger 
    EXECUTE 'CREATE TRIGGER update_meta_adsets_timestamp
             BEFORE UPDATE ON public.meta_adsets
             FOR EACH ROW
             EXECUTE FUNCTION update_meta_adsets_timestamp();';
    
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meta_adsets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meta_adsets TO service_role;
GRANT EXECUTE ON FUNCTION create_meta_adsets_table() TO authenticated;
GRANT EXECUTE ON FUNCTION create_meta_adsets_table() TO service_role;

-- Display success notification
DO $$
BEGIN
  RAISE NOTICE 'Meta ad sets table and functions created successfully.';
END $$; 