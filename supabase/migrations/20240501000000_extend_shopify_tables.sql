-- Extend the shopify_orders table with additional fields
ALTER TABLE shopify_orders 
ADD COLUMN IF NOT EXISTS shipping_address jsonb,
ADD COLUMN IF NOT EXISTS billing_address jsonb,
ADD COLUMN IF NOT EXISTS financial_status text,
ADD COLUMN IF NOT EXISTS fulfillment_status text,
ADD COLUMN IF NOT EXISTS tags text,
ADD COLUMN IF NOT EXISTS note text,
ADD COLUMN IF NOT EXISTS discount_codes jsonb,
ADD COLUMN IF NOT EXISTS shipping_lines jsonb;

-- Create a new table for Shopify customers
CREATE TABLE IF NOT EXISTS shopify_customers (
  id bigint PRIMARY KEY,
  connection_id uuid REFERENCES platform_connections(id),
  email text,
  first_name text,
  last_name text,
  orders_count integer,
  total_spent numeric,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  addresses jsonb,
  default_address jsonb,
  tags text,
  note text,
  metadata jsonb
);

-- Create a new table for Shopify products
CREATE TABLE IF NOT EXISTS shopify_products (
  id bigint PRIMARY KEY,
  connection_id uuid REFERENCES platform_connections(id),
  title text,
  description text,
  vendor text,
  product_type text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  published_at timestamp with time zone,
  tags text,
  variants jsonb,
  images jsonb,
  options jsonb,
  status text
);

-- Create a new table for Shopify sessions data
CREATE TABLE IF NOT EXISTS shopify_analytics (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  connection_id uuid REFERENCES platform_connections(id),
  date date,
  sessions integer,
  page_views integer,
  conversion_rate numeric,
  bounce_rate numeric,
  avg_session_duration numeric,
  source text,
  medium text,
  campaign text,
  metadata jsonb
);

-- Extend the metrics table with additional fields
ALTER TABLE metrics
ADD COLUMN IF NOT EXISTS sessions integer,
ADD COLUMN IF NOT EXISTS page_views integer,
ADD COLUMN IF NOT EXISTS units_sold integer,
ADD COLUMN IF NOT EXISTS items_per_order numeric,
ADD COLUMN IF NOT EXISTS new_customers integer,
ADD COLUMN IF NOT EXISTS returning_customers integer,
ADD COLUMN IF NOT EXISTS top_products jsonb,
ADD COLUMN IF NOT EXISTS top_locations jsonb,
ADD COLUMN IF NOT EXISTS order_timeline jsonb,
ADD COLUMN IF NOT EXISTS order_statuses jsonb;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_shopify_orders_connection_id ON shopify_orders(connection_id);
CREATE INDEX IF NOT EXISTS idx_shopify_orders_created_at ON shopify_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_shopify_customers_connection_id ON shopify_customers(connection_id);
CREATE INDEX IF NOT EXISTS idx_shopify_products_connection_id ON shopify_products(connection_id);
CREATE INDEX IF NOT EXISTS idx_shopify_analytics_connection_id ON shopify_analytics(connection_id);
CREATE INDEX IF NOT EXISTS idx_shopify_analytics_date ON shopify_analytics(date); 