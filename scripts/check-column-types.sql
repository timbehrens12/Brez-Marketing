-- Check data types of relevant columns
SELECT 
    table_name, 
    column_name, 
    data_type, 
    udt_name
FROM 
    information_schema.columns
WHERE 
    table_name IN ('shopify_sales_by_region', 'platform_connections', 'brands')
    AND column_name IN ('id', 'user_id', 'brand_id', 'connection_id')
ORDER BY 
    table_name, 
    column_name; 