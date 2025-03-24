-- Create the meta_ad_insights table if it doesn't exist

-- First check if the table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'meta_ad_insights'
  ) THEN
    -- Create the meta_ad_insights table
    CREATE TABLE public.meta_ad_insights (
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
    CREATE INDEX idx_meta_ad_insights_brand_id ON public.meta_ad_insights(brand_id);
    CREATE INDEX idx_meta_ad_insights_connection_id ON public.meta_ad_insights(connection_id);
    CREATE INDEX idx_meta_ad_insights_date ON public.meta_ad_insights(date);
    
    -- Add foreign key constraints if needed
    -- ALTER TABLE public.meta_ad_insights ADD CONSTRAINT fk_meta_ad_insights_brand_id FOREIGN KEY (brand_id) REFERENCES public.brands(id) ON DELETE CASCADE;
    -- ALTER TABLE public.meta_ad_insights ADD CONSTRAINT fk_meta_ad_insights_connection_id FOREIGN KEY (connection_id) REFERENCES public.platform_connections(id) ON DELETE CASCADE;
    
    -- Enable row level security
    ALTER TABLE public.meta_ad_insights ENABLE ROW LEVEL SECURITY;
    
    -- Create RLS policies
    CREATE POLICY "Allow authenticated users to access meta_ad_insights" 
    ON public.meta_ad_insights
    FOR ALL
    TO authenticated
    USING (true);
    
    RAISE NOTICE 'Created meta_ad_insights table';
  ELSE
    RAISE NOTICE 'meta_ad_insights table already exists';
  END IF;
END
$$;

-- If the table exists but needs to be updated, uncomment and run the ALTER TABLE statements
-- ALTER TABLE public.meta_ad_insights ADD COLUMN IF NOT EXISTS action_values JSONB DEFAULT '[]';
-- ALTER TABLE public.meta_ad_insights ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Check if the table was created successfully
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'meta_ad_insights'
) AS table_exists; 