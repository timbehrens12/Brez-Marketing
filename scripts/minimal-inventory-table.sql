-- Drop the existing shopify_inventory table if it exists
DROP TABLE IF EXISTS public.shopify_inventory;

-- Create a minimal shopify_inventory table with no constraints
CREATE TABLE public.shopify_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id TEXT, -- Using TEXT for all IDs to avoid type casting issues
  connection_id TEXT,
  product_id TEXT NOT NULL,
  variant_id TEXT NOT NULL,
  inventory_item_id TEXT,
  sku TEXT,
  product_title TEXT NOT NULL,
  variant_title TEXT,
  inventory_quantity INTEGER DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comment to the table
COMMENT ON TABLE public.shopify_inventory IS 'Stores inventory data from Shopify stores';

-- Grant permissions
ALTER TABLE public.shopify_inventory ENABLE ROW LEVEL SECURITY;

-- Create a simple policy for all authenticated users
CREATE POLICY "Allow all operations for authenticated users"
  ON public.shopify_inventory
  USING (auth.role() = 'authenticated');

-- Create a policy for all operations
CREATE POLICY "Allow all operations"
  ON public.shopify_inventory
  FOR ALL
  USING (true); 