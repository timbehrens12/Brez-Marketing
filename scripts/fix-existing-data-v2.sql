-- Update existing records with the correct user_id as text
UPDATE shopify_sales_by_region sbr
SET user_id = pc.user_id
FROM platform_connections pc
WHERE sbr.connection_id = pc.id::text
AND sbr.user_id IS NULL; 