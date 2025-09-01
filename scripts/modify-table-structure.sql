-- Check if we need to change the user_id column type
DO $$
DECLARE
    user_id_type text;
BEGIN
    SELECT data_type INTO user_id_type
    FROM information_schema.columns
    WHERE table_name = 'platform_connections' AND column_name = 'user_id';
    
    IF user_id_type = 'text' THEN
        -- If user_id is TEXT in platform_connections, change our column to TEXT as well
        ALTER TABLE shopify_sales_by_region ALTER COLUMN user_id TYPE TEXT;
        RAISE NOTICE 'Changed user_id column to TEXT';
        
        -- Update the RLS policies to use text comparison
        DROP POLICY IF EXISTS select_own_sales_by_region ON shopify_sales_by_region;
        DROP POLICY IF EXISTS insert_own_sales_by_region ON shopify_sales_by_region;
        DROP POLICY IF EXISTS update_own_sales_by_region ON shopify_sales_by_region;
        DROP POLICY IF EXISTS delete_own_sales_by_region ON shopify_sales_by_region;
        
        CREATE POLICY select_own_sales_by_region ON shopify_sales_by_region
          FOR SELECT USING (user_id = auth.uid()::text);
        
        CREATE POLICY insert_own_sales_by_region ON shopify_sales_by_region
          FOR INSERT WITH CHECK (user_id = auth.uid()::text);
        
        CREATE POLICY update_own_sales_by_region ON shopify_sales_by_region
          FOR UPDATE USING (user_id = auth.uid()::text);
        
        CREATE POLICY delete_own_sales_by_region ON shopify_sales_by_region
          FOR DELETE USING (user_id = auth.uid()::text);
        
        RAISE NOTICE 'Updated RLS policies to use TEXT comparison';
    ELSE
        RAISE NOTICE 'No changes needed, user_id type is: %', user_id_type;
    END IF;
END $$; 