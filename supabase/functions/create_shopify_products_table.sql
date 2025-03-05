CREATE OR REPLACE FUNCTION create_shopify_products_table()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the table already exists
  IF NOT EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'shopify_products'
  ) THEN
    -- Create the table
    CREATE TABLE public.shopify_products (
      id TEXT PRIMARY KEY,
      connection_id TEXT REFERENCES public.platform_connections(id),
      title TEXT,
      vendor TEXT,
      product_type TEXT,
      created_at TIMESTAMP WITH TIME ZONE,
      updated_at TIMESTAMP WITH TIME ZONE,
      variants JSONB,
      images JSONB,
      inventory_quantity INTEGER DEFAULT 0,
      view_count INTEGER DEFAULT 0
    );

    -- Add RLS policies
    ALTER TABLE public.shopify_products ENABLE ROW LEVEL SECURITY;

    -- Create policy for select
    CREATE POLICY "Users can view their own products" 
    ON public.shopify_products
    FOR SELECT 
    USING (
      connection_id IN (
        SELECT id FROM public.platform_connections 
        WHERE user_id = auth.uid()
      )
    );

    -- Create policy for insert
    CREATE POLICY "Users can insert their own products" 
    ON public.shopify_products
    FOR INSERT 
    WITH CHECK (
      connection_id IN (
        SELECT id FROM public.platform_connections 
        WHERE user_id = auth.uid()
      )
    );

    -- Create policy for update
    CREATE POLICY "Users can update their own products" 
    ON public.shopify_products
    FOR UPDATE 
    USING (
      connection_id IN (
        SELECT id FROM public.platform_connections 
        WHERE user_id = auth.uid()
      )
    );

    -- Create policy for delete
    CREATE POLICY "Users can delete their own products" 
    ON public.shopify_products
    FOR DELETE 
    USING (
      connection_id IN (
        SELECT id FROM public.platform_connections 
        WHERE user_id = auth.uid()
      )
    );

    -- Create indexes
    CREATE INDEX idx_shopify_products_connection_id ON public.shopify_products(connection_id);
    CREATE INDEX idx_shopify_products_product_type ON public.shopify_products(product_type);
    CREATE INDEX idx_shopify_products_created_at ON public.shopify_products(created_at);
  END IF;
END;
$$; 