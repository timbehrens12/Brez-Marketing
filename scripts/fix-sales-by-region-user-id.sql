-- Update existing records with the correct user_id
UPDATE shopify_sales_by_region sbr
SET user_id = pc.user_id::uuid
FROM platform_connections pc
WHERE sbr.connection_id = pc.id::text
AND sbr.user_id IS NULL; 