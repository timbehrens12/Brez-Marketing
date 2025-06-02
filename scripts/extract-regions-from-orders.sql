-- Extract location data from existing Shopify orders and populate the shopify_sales_by_region table
INSERT INTO shopify_sales_by_region (
  connection_id,
  brand_id,
  user_id,
  order_id,
  created_at,
  city,
  province,
  province_code,
  country,
  country_code,
  total_price,
  order_count
)
SELECT 
  so.connection_id::text,
  so.brand_id::text,
  so.user_id::text,
  so.order_id,
  so.created_at,
  -- Extract location data from customer JSON
  COALESCE(
    (so.customer->'default_address'->>'city'),
    (so.customer->>'city'),
    'Unknown'
  ) as city,
  COALESCE(
    (so.customer->'default_address'->>'province'),
    (so.customer->>'province'),
    'Unknown'
  ) as province,
  COALESCE(
    (so.customer->'default_address'->>'province_code'),
    (so.customer->>'province_code'),
    'Unknown'
  ) as province_code,
  COALESCE(
    (so.customer->'default_address'->>'country'),
    (so.customer->>'country'),
    'Unknown'
  ) as country,
  COALESCE(
    (so.customer->'default_address'->>'country_code'),
    (so.customer->>'country_code'),
    'Unknown'
  ) as country_code,
  so.total_price,
  1 as order_count
FROM 
  shopify_orders so
WHERE 
  so.customer IS NOT NULL
  AND (
    (so.customer->'default_address'->>'city') IS NOT NULL
    OR (so.customer->>'city') IS NOT NULL
  )
ON CONFLICT (connection_id, order_id) 
DO UPDATE SET
  city = EXCLUDED.city,
  province = EXCLUDED.province,
  province_code = EXCLUDED.province_code,
  country = EXCLUDED.country,
  country_code = EXCLUDED.country_code,
  total_price = EXCLUDED.total_price; 