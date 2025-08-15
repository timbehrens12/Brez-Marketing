-- Create shopify_inventory_items table for storing product cost data
CREATE TABLE shopify_inventory_items (
  id TEXT PRIMARY KEY,
  connection_id UUID NOT NULL REFERENCES platform_connections(id) ON DELETE CASCADE,
  cost DECIMAL(12, 2),
  country_code_of_origin TEXT,
  harmonized_system_code TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_shopify_inventory_items_connection_id ON shopify_inventory_items(connection_id);
CREATE INDEX idx_shopify_inventory_items_cost ON shopify_inventory_items(cost);
CREATE INDEX idx_shopify_inventory_items_synced_at ON shopify_inventory_items(synced_at);

-- Add RLS policies
ALTER TABLE shopify_inventory_items ENABLE ROW LEVEL SECURITY;

-- Users can only access their own brand's inventory items
CREATE POLICY "Users can view their own brand inventory items" ON shopify_inventory_items
  FOR SELECT USING (
    connection_id IN (
      SELECT pc.id FROM platform_connections pc
      JOIN brands b ON pc.brand_id = b.id
      WHERE b.user_id = auth.uid()::text
    )
  );

-- Users with brand access can also view inventory items
CREATE POLICY "Brand access users can view inventory items" ON shopify_inventory_items
  FOR SELECT USING (
    connection_id IN (
      SELECT pc.id FROM platform_connections pc
      JOIN brand_access ba ON pc.brand_id = ba.brand_id
      WHERE ba.user_id = auth.uid()::text
    )
  );
