-- Insert sample data into shopify_sales_by_region table
-- First, get the connection_id and brand_id from an existing connection
WITH connection AS (
  SELECT id, brand_id, user_id
  FROM platform_connections
  WHERE platform_type = 'shopify'
  AND status = 'active'
  LIMIT 1
)
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
  connection.id::text,
  connection.brand_id::text,
  connection.user_id,
  'sample-order-' || i,
  NOW() - (i || ' days')::interval,
  city,
  province,
  province_code,
  country,
  country_code,
  (random() * 1000)::numeric(10,2),
  1
FROM
  connection,
  (VALUES
    ('New York', 'New York', 'NY', 'United States', 'US'),
    ('Los Angeles', 'California', 'CA', 'United States', 'US'),
    ('Chicago', 'Illinois', 'IL', 'United States', 'US'),
    ('Houston', 'Texas', 'TX', 'United States', 'US'),
    ('Phoenix', 'Arizona', 'AZ', 'United States', 'US'),
    ('Philadelphia', 'Pennsylvania', 'PA', 'United States', 'US'),
    ('San Antonio', 'Texas', 'TX', 'United States', 'US'),
    ('San Diego', 'California', 'CA', 'United States', 'US'),
    ('Dallas', 'Texas', 'TX', 'United States', 'US'),
    ('San Jose', 'California', 'CA', 'United States', 'US'),
    ('Toronto', 'Ontario', 'ON', 'Canada', 'CA'),
    ('Montreal', 'Quebec', 'QC', 'Canada', 'CA'),
    ('Vancouver', 'British Columbia', 'BC', 'Canada', 'CA'),
    ('London', 'England', 'EN', 'United Kingdom', 'GB'),
    ('Manchester', 'England', 'EN', 'United Kingdom', 'GB'),
    ('Sydney', 'New South Wales', 'NSW', 'Australia', 'AU'),
    ('Melbourne', 'Victoria', 'VIC', 'Australia', 'AU'),
    ('Tokyo', 'Tokyo', 'TK', 'Japan', 'JP'),
    ('Osaka', 'Osaka', 'OS', 'Japan', 'JP'),
    ('Berlin', 'Berlin', 'BE', 'Germany', 'DE')
  ) AS locations(city, province, province_code, country, country_code),
  generate_series(1, 5) AS i; 