-- Create shopify_inventory table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.shopify_inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES public.brands(id),
  connection_id UUID,
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
CREATE INDEX IF NOT EXISTS idx_shopify_inventory_connection_id ON public.shopify_inventory(connection_id);
CREATE INDEX IF NOT EXISTS idx_shopify_inventory_brand_id ON public.shopify_inventory(brand_id);
CREATE INDEX IF NOT EXISTS idx_shopify_inventory_product_id ON public.shopify_inventory(product_id);

-- Add comment to the table
COMMENT ON TABLE public.shopify_inventory IS 'Stores inventory data from Shopify stores'; 