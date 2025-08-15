-- Remove advanced Shopify analytics tables
-- These will be re-implemented with better structure later

-- Drop tables if they exist (in reverse dependency order)
DROP TABLE IF EXISTS shopify_draft_orders_enhanced CASCADE;
DROP TABLE IF EXISTS shopify_discounts_enhanced CASCADE; 
DROP TABLE IF EXISTS shopify_products_enhanced CASCADE;
DROP TABLE IF EXISTS shopify_inventory_items CASCADE;

-- Clean up any orphaned policies
DO $$ 
BEGIN
    -- Remove any remaining policies for these tables
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'shopify_draft_orders_enhanced') THEN
        DROP POLICY IF EXISTS "Users can view draft orders from their connected brands" ON shopify_draft_orders_enhanced;
        DROP POLICY IF EXISTS "Brand access users can view draft orders" ON shopify_draft_orders_enhanced;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'shopify_discounts_enhanced') THEN
        DROP POLICY IF EXISTS "Users can view discounts from their connected brands" ON shopify_discounts_enhanced;
        DROP POLICY IF EXISTS "Brand access users can view discounts" ON shopify_discounts_enhanced;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'shopify_products_enhanced') THEN
        DROP POLICY IF EXISTS "Users can view products from their connected brands" ON shopify_products_enhanced;
        DROP POLICY IF EXISTS "Brand access users can view products" ON shopify_products_enhanced;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'shopify_inventory_items') THEN
        DROP POLICY IF EXISTS "Users can view their own brand inventory items" ON shopify_inventory_items;
        DROP POLICY IF EXISTS "Brand access users can view inventory items" ON shopify_inventory_items;
    END IF;
END $$;

-- Add comment about the removal
COMMENT ON SCHEMA public IS 'Advanced Shopify analytics tables removed on 2025-01-15 for reimplementation';
