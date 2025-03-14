-- Function to check if a table exists
CREATE OR REPLACE FUNCTION public.check_table_exists(table_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = table_name
  );
END;
$$;

-- Function to create the shopify_customers table if it doesn't exist
CREATE OR REPLACE FUNCTION public.create_shopify_customers_table()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the table already exists
  IF NOT EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'shopify_customers'
  ) THEN
    -- Create the shopify_customers table
    CREATE TABLE public.shopify_customers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      connection_id UUID NOT NULL REFERENCES public.platform_connections(id) ON DELETE CASCADE,
      customer_id TEXT NOT NULL,
      email TEXT,
      first_name TEXT,
      last_name TEXT,
      orders_count INTEGER DEFAULT 0,
      total_spent NUMERIC(10, 2) DEFAULT 0,
      city TEXT,
      state_province TEXT,
      country TEXT,
      zip TEXT,
      lat NUMERIC,
      lng NUMERIC,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(connection_id, customer_id)
    );
    
    -- Add indexes for better performance
    CREATE INDEX idx_shopify_customers_connection_id ON public.shopify_customers(connection_id);
    CREATE INDEX idx_shopify_customers_email ON public.shopify_customers(email);
    CREATE INDEX idx_shopify_customers_city ON public.shopify_customers(city);
    CREATE INDEX idx_shopify_customers_state_province ON public.shopify_customers(state_province);
    CREATE INDEX idx_shopify_customers_country ON public.shopify_customers(country);
    
    -- Enable RLS
    ALTER TABLE public.shopify_customers ENABLE ROW LEVEL SECURITY;
    
    -- Create RLS policy
    CREATE POLICY "Allow full access to shopify_customers"
    ON public.shopify_customers
    USING (true)
    WITH CHECK (true);
    
    -- Add comment to the table
    COMMENT ON TABLE public.shopify_customers IS 'Stores customer data from Shopify';
  END IF;
END;
$$; 