-- Drop policies first
DROP POLICY IF EXISTS select_own_sales_by_region ON shopify_sales_by_region;
DROP POLICY IF EXISTS insert_own_sales_by_region ON shopify_sales_by_region;
DROP POLICY IF EXISTS update_own_sales_by_region ON shopify_sales_by_region;
DROP POLICY IF EXISTS delete_own_sales_by_region ON shopify_sales_by_region;

-- Now alter the column type
ALTER TABLE shopify_sales_by_region ALTER COLUMN user_id TYPE TEXT USING user_id::text;

-- Recreate policies with text comparison
CREATE POLICY select_own_sales_by_region ON shopify_sales_by_region
  FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY insert_own_sales_by_region ON shopify_sales_by_region
  FOR INSERT WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY update_own_sales_by_region ON shopify_sales_by_region
  FOR UPDATE USING (user_id = auth.uid()::text);

CREATE POLICY delete_own_sales_by_region ON shopify_sales_by_region
  FOR DELETE USING (user_id = auth.uid()::text); 