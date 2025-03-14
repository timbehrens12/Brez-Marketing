-- Function to create the shopify_customers table if it doesn't exist
CREATE OR REPLACE FUNCTION create_shopify_customers_table()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the table already exists
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'shopify_customers') THEN
    -- Create the shopify_customers table
    CREATE TABLE public.shopify_customers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      connection_id UUID NOT NULL,
      brand_id UUID,
      user_id UUID,
      customer_id TEXT NOT NULL,
      email TEXT,
      first_name TEXT,
      last_name TEXT,
      orders_count INTEGER DEFAULT 0,
      total_spent DECIMAL(10, 2) DEFAULT 0,
      currency TEXT,
      state TEXT,
      tags TEXT[],
      tax_exempt BOOLEAN DEFAULT false,
      phone TEXT,
      addresses JSONB,
      default_address JSONB,
      accepts_marketing BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE,
      updated_at TIMESTAMP WITH TIME ZONE,
      last_order_id TEXT,
      last_order_date TIMESTAMP WITH TIME ZONE,
      note TEXT,
      verified_email BOOLEAN DEFAULT false,
      multipass_identifier TEXT,
      tax_exemptions TEXT[],
      lifetime_value DECIMAL(10, 2) DEFAULT 0,
      average_order_value DECIMAL(10, 2) DEFAULT 0,
      purchase_frequency DECIMAL(10, 2) DEFAULT 0,
      days_since_last_order INTEGER,
      is_returning_customer BOOLEAN DEFAULT false,
      acquisition_source TEXT,
      geographic_region TEXT,
      customer_segment TEXT,
      city TEXT,
      state_province TEXT,
      country TEXT,
      last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(connection_id, customer_id)
    );

    -- Add comment to the table
    COMMENT ON TABLE public.shopify_customers IS 'Stores customer data from Shopify stores';

    -- Create indexes for better performance
    CREATE INDEX idx_shopify_customers_connection_id ON public.shopify_customers(connection_id);
    CREATE INDEX idx_shopify_customers_customer_id ON public.shopify_customers(customer_id);
    CREATE INDEX idx_shopify_customers_brand_id ON public.shopify_customers(brand_id);
    CREATE INDEX idx_shopify_customers_user_id ON public.shopify_customers(user_id);
    CREATE INDEX idx_shopify_customers_city ON public.shopify_customers(city);
    CREATE INDEX idx_shopify_customers_state_province ON public.shopify_customers(state_province);
    CREATE INDEX idx_shopify_customers_country ON public.shopify_customers(country);

    -- Enable Row Level Security
    ALTER TABLE public.shopify_customers ENABLE ROW LEVEL SECURITY;

    -- Create policies for authenticated users
    CREATE POLICY "Users can view their own customer data"
      ON public.shopify_customers
      FOR SELECT
      USING (
        brand_id IN (
          SELECT id FROM public.brands WHERE user_id = auth.uid()
        )
      );

    CREATE POLICY "Users can insert their own customer data"
      ON public.shopify_customers
      FOR INSERT
      WITH CHECK (
        brand_id IN (
          SELECT id FROM public.brands WHERE user_id = auth.uid()
        )
      );

    CREATE POLICY "Users can update their own customer data"
      ON public.shopify_customers
      FOR UPDATE
      USING (
        brand_id IN (
          SELECT id FROM public.brands WHERE user_id = auth.uid()
        )
      );

    CREATE POLICY "Users can delete their own customer data"
      ON public.shopify_customers
      FOR DELETE
      USING (
        brand_id IN (
          SELECT id FROM public.brands WHERE user_id = auth.uid()
        )
      );

    -- Create a fallback policy for all operations (in case the above policies don't match)
    CREATE POLICY "Allow all operations"
      ON public.shopify_customers
      FOR ALL
      USING (true);

    -- Grant privileges
    GRANT ALL ON public.shopify_customers TO authenticated;
    GRANT ALL ON public.shopify_customers TO anon;
    GRANT ALL ON public.shopify_customers TO service_role;

    RAISE NOTICE 'Created shopify_customers table with indexes and RLS policies';
  ELSE
    RAISE NOTICE 'shopify_customers table already exists';
  END IF;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION create_shopify_customers_table() TO authenticated;
GRANT EXECUTE ON FUNCTION create_shopify_customers_table() TO anon;
GRANT EXECUTE ON FUNCTION create_shopify_customers_table() TO service_role; 