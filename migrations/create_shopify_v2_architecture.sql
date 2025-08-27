-- =====================================================
-- NEW SHOPIFY V2 ARCHITECTURE - PRODUCTION READY
-- =====================================================

-- Control tables for job management and progress tracking
CREATE SCHEMA IF NOT EXISTS control;
CREATE SCHEMA IF NOT EXISTS stage;

-- ETL Job tracking table
CREATE TABLE IF NOT EXISTS control.etl_job (
  id BIGSERIAL PRIMARY KEY,
  brand_id UUID NOT NULL,
  source TEXT NOT NULL DEFAULT 'shopify',
  entity TEXT NOT NULL, -- 'orders'|'customers'|'products'
  job_type TEXT NOT NULL, -- 'recent_sync'|'bulk_orders'|'bulk_customers'|'bulk_products'|'incremental'
  status TEXT NOT NULL DEFAULT 'queued', -- 'queued'|'running'|'completed'|'failed'
  shopify_bulk_id TEXT, -- For tracking Shopify bulk operation IDs
  rows_written BIGINT DEFAULT 0,
  total_rows BIGINT,
  progress_pct DECIMAL(5,2) DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ETL Cursor for incremental syncs
CREATE TABLE IF NOT EXISTS control.etl_cursor (
  brand_id UUID NOT NULL,
  source TEXT NOT NULL DEFAULT 'shopify',
  entity TEXT NOT NULL,
  last_complete_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (brand_id, source, entity)
);

-- Staging tables (landing zone for bulk imports)
CREATE TABLE IF NOT EXISTS stage.shopify_orders (
  order_id TEXT PRIMARY KEY,
  brand_id UUID NOT NULL,
  connection_id UUID NOT NULL,
  name TEXT,
  order_number TEXT,
  email TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  currency TEXT DEFAULT 'USD',
  total_price NUMERIC(10,2) DEFAULT 0,
  subtotal_price NUMERIC(10,2) DEFAULT 0,
  total_tax NUMERIC(10,2) DEFAULT 0,
  total_discounts NUMERIC(10,2) DEFAULT 0,
  financial_status TEXT,
  fulfillment_status TEXT,
  customer_id TEXT,
  customer_email TEXT,
  customer_first_name TEXT,
  customer_last_name TEXT,
  tags TEXT,
  note TEXT,
  shipping_city TEXT,
  shipping_province TEXT,
  shipping_country TEXT,
  shipping_country_code TEXT,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stage.shopify_line_items (
  order_id TEXT NOT NULL,
  line_item_id TEXT NOT NULL,
  brand_id UUID NOT NULL,
  connection_id UUID NOT NULL,
  name TEXT,
  title TEXT,
  quantity INTEGER DEFAULT 0,
  price NUMERIC(10,2) DEFAULT 0,
  total_discount NUMERIC(10,2) DEFAULT 0,
  sku TEXT,
  product_id TEXT,
  variant_id TEXT,
  variant_title TEXT,
  vendor TEXT,
  grams INTEGER,
  requires_shipping BOOLEAN DEFAULT true,
  taxable BOOLEAN DEFAULT true,
  gift_card BOOLEAN DEFAULT false,
  fulfillment_service TEXT,
  fulfillment_status TEXT,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (order_id, line_item_id)
);

CREATE TABLE IF NOT EXISTS stage.shopify_customers (
  customer_id TEXT PRIMARY KEY,
  brand_id UUID NOT NULL,
  connection_id UUID NOT NULL,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  accepts_marketing BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  orders_count INTEGER DEFAULT 0,
  total_spent NUMERIC(10,2) DEFAULT 0,
  last_order_id TEXT,
  last_order_name TEXT,
  currency TEXT DEFAULT 'USD',
  marketing_opt_in_level TEXT,
  email_marketing_consent TEXT,
  sms_marketing_consent TEXT,
  tags TEXT,
  note TEXT,
  tax_exempt BOOLEAN DEFAULT false,
  verified_email BOOLEAN DEFAULT false,
  multipass_identifier TEXT,
  addresses JSONB,
  default_address JSONB,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stage.shopify_products (
  product_id TEXT PRIMARY KEY,
  brand_id UUID NOT NULL,
  connection_id UUID NOT NULL,
  title TEXT,
  body_html TEXT,
  vendor TEXT,
  product_type TEXT,
  handle TEXT,
  status TEXT,
  published_scope TEXT,
  tags TEXT,
  options JSONB,
  variants JSONB,
  images JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Production app tables (cleaned, consistent data)
CREATE TABLE IF NOT EXISTS app.shopify_orders (
  order_id TEXT PRIMARY KEY,
  brand_id UUID NOT NULL,
  connection_id UUID NOT NULL,
  name TEXT,
  order_number TEXT,
  email TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  currency TEXT DEFAULT 'USD',
  total_price NUMERIC(10,2) DEFAULT 0,
  subtotal_price NUMERIC(10,2) DEFAULT 0,
  total_tax NUMERIC(10,2) DEFAULT 0,
  total_discounts NUMERIC(10,2) DEFAULT 0,
  financial_status TEXT,
  fulfillment_status TEXT,
  customer_id TEXT,
  customer_email TEXT,
  customer_first_name TEXT,
  customer_last_name TEXT,
  tags TEXT,
  note TEXT,
  shipping_city TEXT,
  shipping_province TEXT,
  shipping_country TEXT,
  shipping_country_code TEXT,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app.shopify_line_items (
  order_id TEXT NOT NULL,
  line_item_id TEXT NOT NULL,
  brand_id UUID NOT NULL,
  connection_id UUID NOT NULL,
  name TEXT,
  title TEXT,
  quantity INTEGER DEFAULT 0,
  price NUMERIC(10,2) DEFAULT 0,
  total_discount NUMERIC(10,2) DEFAULT 0,
  sku TEXT,
  product_id TEXT,
  variant_id TEXT,
  variant_title TEXT,
  vendor TEXT,
  grams INTEGER,
  requires_shipping BOOLEAN DEFAULT true,
  taxable BOOLEAN DEFAULT true,
  gift_card BOOLEAN DEFAULT false,
  fulfillment_service TEXT,
  fulfillment_status TEXT,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (order_id, line_item_id)
);

CREATE TABLE IF NOT EXISTS app.shopify_customers (
  customer_id TEXT PRIMARY KEY,
  brand_id UUID NOT NULL,
  connection_id UUID NOT NULL,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  accepts_marketing BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  orders_count INTEGER DEFAULT 0,
  total_spent NUMERIC(10,2) DEFAULT 0,
  last_order_id TEXT,
  last_order_name TEXT,
  currency TEXT DEFAULT 'USD',
  marketing_opt_in_level TEXT,
  email_marketing_consent TEXT,
  sms_marketing_consent TEXT,
  tags TEXT,
  note TEXT,
  tax_exempt BOOLEAN DEFAULT false,
  verified_email BOOLEAN DEFAULT false,
  multipass_identifier TEXT,
  addresses JSONB,
  default_address JSONB,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app.shopify_products (
  product_id TEXT PRIMARY KEY,
  brand_id UUID NOT NULL,
  connection_id UUID NOT NULL,
  title TEXT,
  body_html TEXT,
  vendor TEXT,
  product_type TEXT,
  handle TEXT,
  status TEXT,
  published_scope TEXT,
  tags TEXT,
  options JSONB,
  variants JSONB,
  images JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_etl_job_brand_status ON control.etl_job(brand_id, status);
CREATE INDEX IF NOT EXISTS idx_etl_job_created_at ON control.etl_job(created_at);
CREATE INDEX IF NOT EXISTS idx_etl_cursor_brand_entity ON control.etl_cursor(brand_id, entity);

-- Staging table indexes
CREATE INDEX IF NOT EXISTS idx_stage_orders_brand_created ON stage.shopify_orders(brand_id, created_at);
CREATE INDEX IF NOT EXISTS idx_stage_orders_connection ON stage.shopify_orders(connection_id);
CREATE INDEX IF NOT EXISTS idx_stage_line_items_order ON stage.shopify_line_items(order_id);
CREATE INDEX IF NOT EXISTS idx_stage_customers_brand ON stage.shopify_customers(brand_id);
CREATE INDEX IF NOT EXISTS idx_stage_products_brand ON stage.shopify_products(brand_id);

-- App table indexes
CREATE INDEX IF NOT EXISTS idx_app_orders_brand_created ON app.shopify_orders(brand_id, created_at);
CREATE INDEX IF NOT EXISTS idx_app_orders_connection ON app.shopify_orders(connection_id);
CREATE INDEX IF NOT EXISTS idx_app_orders_customer ON app.shopify_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_app_line_items_order ON app.shopify_line_items(order_id);
CREATE INDEX IF NOT EXISTS idx_app_line_items_product ON app.shopify_line_items(product_id);
CREATE INDEX IF NOT EXISTS idx_app_customers_brand ON app.shopify_customers(brand_id);
CREATE INDEX IF NOT EXISTS idx_app_customers_email ON app.shopify_customers(email);
CREATE INDEX IF NOT EXISTS idx_app_products_brand ON app.shopify_products(brand_id);

-- Functions for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_etl_job_updated_at BEFORE UPDATE ON control.etl_job
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON SCHEMA control IS 'ETL job control and progress tracking';
COMMENT ON SCHEMA stage IS 'Staging area for bulk data imports';
COMMENT ON TABLE control.etl_job IS 'Tracks sync jobs with progress and status';
COMMENT ON TABLE control.etl_cursor IS 'Tracks last sync timestamps for incremental updates';
COMMENT ON TABLE stage.shopify_orders IS 'Staging area for Shopify orders before processing';
COMMENT ON TABLE app.shopify_orders IS 'Production Shopify orders data';
