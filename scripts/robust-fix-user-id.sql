-- First, let's check the data types
SELECT 
    table_name, 
    column_name, 
    data_type, 
    udt_name
FROM 
    information_schema.columns
WHERE 
    table_name IN ('shopify_sales_by_region', 'platform_connections', 'brands')
    AND column_name IN ('id', 'user_id', 'brand_id', 'connection_id');

-- Now, let's try to update with explicit type casting
DO $$
BEGIN
    -- Try with UUID casting
    BEGIN
        UPDATE shopify_sales_by_region sbr
        SET user_id = pc.user_id::uuid
        FROM platform_connections pc
        WHERE sbr.connection_id = pc.id::text
        AND sbr.user_id IS NULL;
        
        RAISE NOTICE 'Updated with UUID casting';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'UUID casting failed: %', SQLERRM;
        
        -- Try with TEXT to UUID casting
        BEGIN
            UPDATE shopify_sales_by_region sbr
            SET user_id = pc.user_id::text::uuid
            FROM platform_connections pc
            WHERE sbr.connection_id = pc.id::text
            AND sbr.user_id IS NULL;
            
            RAISE NOTICE 'Updated with TEXT to UUID casting';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'TEXT to UUID casting failed: %', SQLERRM;
            
            -- Try without casting
            BEGIN
                UPDATE shopify_sales_by_region sbr
                SET user_id = pc.user_id
                FROM platform_connections pc
                WHERE sbr.connection_id = pc.id::text
                AND sbr.user_id IS NULL;
                
                RAISE NOTICE 'Updated without casting';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Update without casting failed: %', SQLERRM;
                RAISE EXCEPTION 'All update attempts failed';
            END;
        END;
    END;
END $$; 