-- Script to add fake Shopify data for testing
-- This script adds data for multiple times today and for July

-- First, get connection info
WITH connection_info AS (
  SELECT 
    pc.id as connection_id,
    pc.brand_id,
    pc.user_id
  FROM 
    platform_connections pc
  WHERE 
    pc.platform_type = 'shopify'
    AND pc.status = 'active'
  LIMIT 1
),
-- Generate fake orders for TODAY (multiple times throughout the day)
today_orders AS (
  SELECT
    ci.connection_id,
    ci.brand_id,
    ci.user_id,
    -- Generate unique order IDs for today
    'fake-today-' || generate_series(1, 15) || '-' || extract(hour from time_slot)::text || extract(minute from time_slot)::text as order_id,
    generate_series(1000, 1014) as order_number,
    time_slot as created_at,
    time_slot as updated_at,
    time_slot as processed_at,
    -- Random order values between $25-500
    (25 + random() * 475)::numeric(10,2) as total_price,
    -- Subtotal is 85-95% of total
    ((25 + random() * 475) * (0.85 + random() * 0.1))::numeric(10,2) as subtotal_price,
    -- Tax is 5-15% of subtotal
    ((25 + random() * 475) * (0.85 + random() * 0.1) * (0.05 + random() * 0.1))::numeric(10,2) as total_tax,
    -- Random discounts (0-20%)
    ((25 + random() * 475) * random() * 0.2)::numeric(10,2) as total_discounts,
    'USD' as currency,
    'paid' as financial_status,
    CASE WHEN random() > 0.3 THEN 'fulfilled' ELSE 'unfulfilled' END as fulfillment_status,
    'customer' || generate_series(1, 15) || '@example.com' as customer_email,
    generate_series(100001, 100015)::text as customer_id,
    -- Line items JSON
    jsonb_build_array(
      jsonb_build_object(
        'id', 900000000 + generate_series(1, 15),
        'title', CASE (generate_series(1, 15) % 5)
          WHEN 0 THEN 'Premium T-Shirt'
          WHEN 1 THEN 'Classic Hoodie'
          WHEN 2 THEN 'Leather Wallet'
          WHEN 3 THEN 'Wireless Headphones'
          ELSE 'Artisan Coffee Mug'
        END,
        'quantity', (1 + random() * 3)::int,
        'price', (15 + random() * 85)::numeric(10,2),
        'sku', 'FAKE-SKU-' || generate_series(1, 15),
        'product_id', 800000000 + generate_series(1, 15),
        'variant_id', 700000000 + generate_series(1, 15)
      )
    ) as line_items,
    'Shopify' as gateway,
    'order,testing,fake-data' as tags
  FROM 
    connection_info ci
  CROSS JOIN (
    -- Generate time slots throughout today
    SELECT 
      date_trunc('day', NOW()) + 
      (interval '1 hour' * h) + 
      (interval '15 minutes' * m) as time_slot
    FROM 
      generate_series(8, 20) h,  -- 8 AM to 8 PM
      generate_series(0, 3) m    -- Every 15 minutes
    ORDER BY time_slot
    LIMIT 15  -- Limit to 15 orders for today
  ) times
),
-- Generate fake orders for JULY (last month)
july_orders AS (
  SELECT
    ci.connection_id,
    ci.brand_id,
    ci.user_id,
    -- Generate unique order IDs for July
    'fake-july-' || day_num || '-' || order_seq as order_id,
    (2000 + day_num * 10 + order_seq) as order_number,
    ('2024-07-' || lpad(day_num::text, 2, '0') || ' ' || 
     lpad((9 + random() * 10)::int::text, 2, '0') || ':' || 
     lpad((random() * 60)::int::text, 2, '0') || ':00+00')::timestamptz as created_at,
    ('2024-07-' || lpad(day_num::text, 2, '0') || ' ' || 
     lpad((9 + random() * 10)::int::text, 2, '0') || ':' || 
     lpad((random() * 60)::int::text, 2, '0') || ':00+00')::timestamptz as updated_at,
    ('2024-07-' || lpad(day_num::text, 2, '0') || ' ' || 
     lpad((9 + random() * 10)::int::text, 2, '0') || ':' || 
     lpad((random() * 60)::int::text, 2, '0') || ':00+00')::timestamptz as processed_at,
    -- Random order values between $30-600 (slightly higher for July)
    (30 + random() * 570)::numeric(10,2) as total_price,
    -- Subtotal is 85-95% of total
    ((30 + random() * 570) * (0.85 + random() * 0.1))::numeric(10,2) as subtotal_price,
    -- Tax is 5-15% of subtotal
    ((30 + random() * 570) * (0.85 + random() * 0.1) * (0.05 + random() * 0.1))::numeric(10,2) as total_tax,
    -- Random discounts (0-15%)
    ((30 + random() * 570) * random() * 0.15)::numeric(10,2) as total_discounts,
    'USD' as currency,
    CASE WHEN random() > 0.1 THEN 'paid' ELSE 'pending' END as financial_status,
    CASE WHEN random() > 0.2 THEN 'fulfilled' ELSE 'unfulfilled' END as fulfillment_status,
    'july-customer' || (day_num * 10 + order_seq) || '@example.com' as customer_email,
    (200000 + day_num * 10 + order_seq)::text as customer_id,
    -- Line items JSON
    jsonb_build_array(
      jsonb_build_object(
        'id', 800000000 + (day_num * 10 + order_seq),
        'title', CASE ((day_num * 10 + order_seq) % 8)
          WHEN 0 THEN 'Summer Tank Top'
          WHEN 1 THEN 'Beach Shorts'
          WHEN 2 THEN 'Sunglasses'
          WHEN 3 THEN 'Flip Flops'
          WHEN 4 THEN 'Beach Towel'
          WHEN 5 THEN 'Sun Hat'
          WHEN 6 THEN 'Waterproof Phone Case'
          ELSE 'Portable Speaker'
        END,
        'quantity', (1 + random() * 4)::int,
        'price', (20 + random() * 120)::numeric(10,2),
        'sku', 'JULY-SKU-' || (day_num * 10 + order_seq),
        'product_id', 900000000 + (day_num * 10 + order_seq),
        'variant_id', 600000000 + (day_num * 10 + order_seq)
      )
    ) as line_items,
    'Shopify' as gateway,
    'july,summer,testing,fake-data' as tags
  FROM 
    connection_info ci
  CROSS JOIN generate_series(1, 31) day_num  -- All days in July
  CROSS JOIN generate_series(1, 3) order_seq  -- 3 orders per day on average
  WHERE random() > 0.3  -- Add some randomness, about 70% of possible orders
  LIMIT 65  -- Limit to ~65 orders for July
)

-- Insert TODAY's orders
INSERT INTO shopify_orders (
  id,
  connection_id,
  brand_id,
  user_id,
  order_number,
  created_at,
  updated_at,
  processed_at,
  total_price,
  subtotal_price,
  total_tax,
  total_discounts,
  currency,
  financial_status,
  fulfillment_status,
  customer_email,
  customer_id,
  line_items,
  gateway,
  tags
)
SELECT 
  order_id,
  connection_id::text,
  brand_id::text,
  user_id::text,
  order_number,
  created_at,
  updated_at,
  processed_at,
  total_price,
  subtotal_price,
  total_tax,
  total_discounts,
  currency,
  financial_status,
  fulfillment_status,
  customer_email,
  customer_id,
  line_items,
  gateway,
  tags
FROM today_orders
ON CONFLICT (id) DO NOTHING;

-- Insert JULY's orders
INSERT INTO shopify_orders (
  id,
  connection_id,
  brand_id,
  user_id,
  order_number,
  created_at,
  updated_at,
  processed_at,
  total_price,
  subtotal_price,
  total_tax,
  total_discounts,
  currency,
  financial_status,
  fulfillment_status,
  customer_email,
  customer_id,
  line_items,
  gateway,
  tags
)
SELECT 
  order_id,
  connection_id::text,
  brand_id::text,
  user_id::text,
  order_number,
  created_at,
  updated_at,
  processed_at,
  total_price,
  subtotal_price,
  total_tax,
  total_discounts,
  currency,
  financial_status,
  fulfillment_status,
  customer_email,
  customer_id,
  line_items,
  gateway,
  tags
FROM july_orders
ON CONFLICT (id) DO NOTHING;

-- Also add corresponding regional sales data for today's orders
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
  to_orders.connection_id::text,
  to_orders.brand_id::text,
  to_orders.user_id::text,
  to_orders.order_id,
  to_orders.created_at,
  cities.city,
  cities.province,
  cities.province_code,
  cities.country,
  cities.country_code,
  to_orders.total_price,
  1
FROM today_orders to_orders
CROSS JOIN (
  SELECT * FROM (VALUES
    ('New York', 'New York', 'NY', 'United States', 'US'),
    ('Los Angeles', 'California', 'CA', 'United States', 'US'),
    ('Chicago', 'Illinois', 'IL', 'United States', 'US'),
    ('Houston', 'Texas', 'TX', 'United States', 'US'),
    ('Phoenix', 'Arizona', 'AZ', 'United States', 'US'),
    ('Miami', 'Florida', 'FL', 'United States', 'US'),
    ('Seattle', 'Washington', 'WA', 'United States', 'US'),
    ('Boston', 'Massachusetts', 'MA', 'United States', 'US'),
    ('Toronto', 'Ontario', 'ON', 'Canada', 'CA'),
    ('Vancouver', 'British Columbia', 'BC', 'Canada', 'CA')
  ) AS cities_data(city, province, province_code, country, country_code)
  ORDER BY random()
  LIMIT 1
) cities
ON CONFLICT (connection_id, order_id) DO NOTHING;

-- Add corresponding regional sales data for July's orders
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
  jo_orders.connection_id::text,
  jo_orders.brand_id::text,
  jo_orders.user_id::text,
  jo_orders.order_id,
  jo_orders.created_at,
  cities.city,
  cities.province,
  cities.province_code,
  cities.country,
  cities.country_code,
  jo_orders.total_price,
  1
FROM july_orders jo_orders
CROSS JOIN (
  SELECT * FROM (VALUES
    ('New York', 'New York', 'NY', 'United States', 'US'),
    ('Los Angeles', 'California', 'CA', 'United States', 'US'),
    ('Chicago', 'Illinois', 'IL', 'United States', 'US'),
    ('Houston', 'Texas', 'TX', 'United States', 'US'),
    ('Phoenix', 'Arizona', 'AZ', 'United States', 'US'),
    ('Miami', 'Florida', 'FL', 'United States', 'US'),
    ('Seattle', 'Washington', 'WA', 'United States', 'US'),
    ('Boston', 'Massachusetts', 'MA', 'United States', 'US'),
    ('Denver', 'Colorado', 'CO', 'United States', 'US'),
    ('Atlanta', 'Georgia', 'GA', 'United States', 'US'),
    ('Toronto', 'Ontario', 'ON', 'Canada', 'CA'),
    ('Montreal', 'Quebec', 'QC', 'Canada', 'CA'),
    ('Vancouver', 'British Columbia', 'BC', 'Canada', 'CA')
  ) AS cities_data(city, province, province_code, country, country_code)
  ORDER BY random()
  LIMIT 1
) cities
ON CONFLICT (connection_id, order_id) DO NOTHING;

-- Print summary
SELECT 
  'Summary of inserted fake data:' as message,
  (SELECT COUNT(*) FROM shopify_orders WHERE id LIKE 'fake-today-%') as today_orders,
  (SELECT COUNT(*) FROM shopify_orders WHERE id LIKE 'fake-july-%') as july_orders,
  (SELECT SUM(total_price) FROM shopify_orders WHERE id LIKE 'fake-today-%') as today_total_sales,
  (SELECT SUM(total_price) FROM shopify_orders WHERE id LIKE 'fake-july-%') as july_total_sales;


