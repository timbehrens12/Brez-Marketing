-- Check the data type of user_id in platform_connections
DO $$
DECLARE
    user_id_type text;
BEGIN
    SELECT data_type INTO user_id_type
    FROM information_schema.columns
    WHERE table_name = 'platform_connections' AND column_name = 'user_id';
    
    IF user_id_type = 'uuid' THEN
        -- If user_id is UUID in platform_connections
        EXECUTE '
            UPDATE shopify_sales_by_region sbr
            SET user_id = pc.user_id::uuid
            FROM platform_connections pc
            WHERE sbr.connection_id = pc.id::text
            AND sbr.user_id IS NULL;
        ';
    ELSIF user_id_type = 'text' THEN
        -- If user_id is TEXT in platform_connections
        EXECUTE '
            UPDATE shopify_sales_by_region sbr
            SET user_id = pc.user_id::text::uuid
            FROM platform_connections pc
            WHERE sbr.connection_id = pc.id::text
            AND sbr.user_id IS NULL;
        ';
    ELSE
        RAISE NOTICE 'Unexpected data type for user_id: %', user_id_type;
    END IF;
END $$; 