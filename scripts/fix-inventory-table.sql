-- Check if platform_connections table exists, if not create it
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'platform_connections') THEN
        CREATE TABLE public.platform_connections (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL,
            brand_id UUID REFERENCES public.brands(id),
            platform_type TEXT NOT NULL,
            shop TEXT,
            access_token TEXT,
            refresh_token TEXT,
            expires_at TIMESTAMP WITH TIME ZONE,
            status TEXT DEFAULT 'active',
            sync_status TEXT DEFAULT 'pending',
            last_synced_at TIMESTAMP WITH TIME ZONE,
            metadata JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Add indexes for better performance
        CREATE INDEX idx_platform_connections_user_id ON public.platform_connections(user_id);
        CREATE INDEX idx_platform_connections_brand_id ON public.platform_connections(brand_id);
        CREATE INDEX idx_platform_connections_platform_type ON public.platform_connections(platform_type);
        
        -- Add comment to the table
        COMMENT ON TABLE public.platform_connections IS 'Stores connections to external platforms like Shopify, Meta, etc.';
        
        -- Enable RLS
        ALTER TABLE public.platform_connections ENABLE ROW LEVEL SECURITY;
        
        -- Create policies
        CREATE POLICY "Users can view their own connections"
            ON public.platform_connections
            FOR SELECT
            USING (user_id = auth.uid());
            
        CREATE POLICY "Users can insert their own connections"
            ON public.platform_connections
            FOR INSERT
            WITH CHECK (user_id = auth.uid());
            
        CREATE POLICY "Users can update their own connections"
            ON public.platform_connections
            FOR UPDATE
            USING (user_id = auth.uid());
            
        CREATE POLICY "Users can delete their own connections"
            ON public.platform_connections
            FOR DELETE
            USING (user_id = auth.uid());
    END IF;
END
$$;

-- Drop the existing shopify_inventory table if it exists
DROP TABLE IF EXISTS public.shopify_inventory;

-- Create shopify_inventory table
CREATE TABLE public.shopify_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES public.brands(id),
  connection_id UUID REFERENCES public.platform_connections(id),
  product_id TEXT NOT NULL,
  variant_id TEXT NOT NULL,
  inventory_item_id TEXT,
  sku TEXT,
  product_title TEXT NOT NULL,
  variant_title TEXT,
  inventory_quantity INTEGER DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(connection_id, product_id, variant_id)
);

-- Add indexes for better performance
CREATE INDEX idx_shopify_inventory_connection_id ON public.shopify_inventory(connection_id);
CREATE INDEX idx_shopify_inventory_brand_id ON public.shopify_inventory(brand_id);
CREATE INDEX idx_shopify_inventory_product_id ON public.shopify_inventory(product_id);

-- Add comment to the table
COMMENT ON TABLE public.shopify_inventory IS 'Stores inventory data from Shopify stores';

-- Grant permissions
ALTER TABLE public.shopify_inventory ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Users can view their own inventory data"
  ON public.shopify_inventory
  FOR SELECT
  USING (
    brand_id IN (
      SELECT id FROM public.brands WHERE user_id = auth.uid()
    )
  );

-- Create policy for authenticated users to insert/update
CREATE POLICY "Users can insert their own inventory data"
  ON public.shopify_inventory
  FOR INSERT
  WITH CHECK (
    brand_id IN (
      SELECT id FROM public.brands WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own inventory data"
  ON public.shopify_inventory
  FOR UPDATE
  USING (
    brand_id IN (
      SELECT id FROM public.brands WHERE user_id = auth.uid()
    )
  );

-- Create policy for authenticated users to delete
CREATE POLICY "Users can delete their own inventory data"
  ON public.shopify_inventory
  FOR DELETE
  USING (
    brand_id IN (
      SELECT id FROM public.brands WHERE user_id = auth.uid()
    )
  ); 