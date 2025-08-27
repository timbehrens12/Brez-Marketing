-- =====================================================
-- SHOPIFY V2 ARCHITECTURE - CORRECTED FOR PRODUCTION
-- =====================================================
-- This file contains the corrected schema that matches
-- the existing production tables structure.

-- Control tables for job management and progress tracking
CREATE SCHEMA IF NOT EXISTS control;
CREATE SCHEMA IF NOT EXISTS stage;

-- ETL Job tracking table
CREATE TABLE IF NOT EXISTS control.etl_job (
  id BIGSERIAL PRIMARY KEY,
  brand_id UUID NOT NULL,
  source TEXT NOT NULL DEFAULT 'shopify',
  entity TEXT NOT NULL, -- 'orders'|'customers'|'products'|'recent_sync'
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

-- ETL Cursor tracking table for incremental syncs
CREATE TABLE IF NOT EXISTS control.etl_cursor (
  id BIGSERIAL PRIMARY KEY,
  brand_id UUID NOT NULL,
  source TEXT NOT NULL DEFAULT 'shopify',
  entity TEXT NOT NULL,
  cursor_type TEXT NOT NULL DEFAULT 'updated_at',
  cursor_value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(brand_id, source, entity, cursor_type)
);

-- Staging table for orders (CORRECTED to match production schema)
CREATE TABLE IF NOT EXISTS stage.shopify_orders (
  id BIGINT PRIMARY KEY, -- Shopify order ID (matches production)
  brand_id UUID NOT NULL,
  connection_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  order_number INTEGER,
  total_price DECIMAL(12,2),
  subtotal_price DECIMAL(12,2),
  total_tax DECIMAL(12,2),
  total_discounts DECIMAL(12,2),
  currency TEXT,
  financial_status TEXT,
  fulfillment_status TEXT,
  customer_id BIGINT,
  customer_email TEXT,
  customer_first_name TEXT,
  customer_last_name TEXT,
  line_items JSONB,
  line_items_count INTEGER,
  shipping_lines JSONB,
  discount_codes JSONB,
  tags TEXT,
  note TEXT,
  browser_ip TEXT,
  gateway TEXT,
  user_id TEXT,
  bulk_imported BOOLEAN DEFAULT true,
  created_at_timestamp TIMESTAMPTZ DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(id, brand_id)
);

-- Staging table for customers
CREATE TABLE IF NOT EXISTS stage.shopify_customers (
  id BIGSERIAL PRIMARY KEY,
  customer_id TEXT NOT NULL,
  brand_id UUID NOT NULL,
  connection_id UUID,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  orders_count INTEGER DEFAULT 0,
  total_spent DECIMAL(12,2) DEFAULT 0,
  state TEXT,
  tags TEXT,
  currency TEXT,
  accepts_marketing BOOLEAN DEFAULT FALSE,
  verified_email BOOLEAN DEFAULT FALSE,
  tax_exempt BOOLEAN DEFAULT FALSE,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(customer_id, brand_id)
);

-- Staging table for products
CREATE TABLE IF NOT EXISTS stage.shopify_products (
  id BIGSERIAL PRIMARY KEY,
  product_id TEXT NOT NULL,
  brand_id UUID NOT NULL,
  connection_id UUID,
  title TEXT,
  handle TEXT,
  vendor TEXT,
  product_type TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  tags TEXT,
  template_suffix TEXT,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, brand_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_etl_job_brand_status ON control.etl_job(brand_id, status);
CREATE INDEX IF NOT EXISTS idx_etl_job_shopify_bulk ON control.etl_job(shopify_bulk_id) WHERE shopify_bulk_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_etl_cursor_brand_entity ON control.etl_cursor(brand_id, entity);

-- Staging table indexes
CREATE INDEX IF NOT EXISTS idx_stage_orders_brand ON stage.shopify_orders(brand_id);
CREATE INDEX IF NOT EXISTS idx_stage_orders_created ON stage.shopify_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_stage_customers_brand ON stage.shopify_customers(brand_id);
CREATE INDEX IF NOT EXISTS idx_stage_products_brand ON stage.shopify_products(brand_id);

-- =====================================================
-- PROMOTION FUNCTIONS (CORRECTED)
-- =====================================================

-- Function to promote orders from staging to production
CREATE OR REPLACE FUNCTION promote_orders_to_production(brand_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
    rows_affected INTEGER;
BEGIN
    -- Upsert orders from stage to public using correct schema
    INSERT INTO public.shopify_orders 
    (id, brand_id, connection_id, created_at, updated_at, processed_at, closed_at,
     order_number, total_price, subtotal_price, total_tax, total_discounts, 
     currency, financial_status, fulfillment_status, customer_id, customer_email,
     customer_first_name, customer_last_name, line_items, line_items_count,
     shipping_lines, discount_codes, tags, note, browser_ip, gateway, user_id,
     bulk_imported, created_at_timestamp, last_synced_at)
    SELECT 
        id, brand_id, connection_id, created_at, updated_at, processed_at, closed_at,
        order_number, total_price, subtotal_price, total_tax, total_discounts,
        currency, financial_status, fulfillment_status, customer_id, customer_email,
        customer_first_name, customer_last_name, line_items, line_items_count,
        shipping_lines, discount_codes, tags, note, browser_ip, gateway, user_id,
        bulk_imported, created_at_timestamp, last_synced_at
    FROM stage.shopify_orders 
    WHERE brand_id = brand_id_param
    ON CONFLICT (id) 
    DO UPDATE SET
        brand_id = EXCLUDED.brand_id,
        connection_id = EXCLUDED.connection_id,
        updated_at = EXCLUDED.updated_at,
        processed_at = EXCLUDED.processed_at,
        closed_at = EXCLUDED.closed_at,
        order_number = EXCLUDED.order_number,
        total_price = EXCLUDED.total_price,
        subtotal_price = EXCLUDED.subtotal_price,
        total_tax = EXCLUDED.total_tax,
        total_discounts = EXCLUDED.total_discounts,
        currency = EXCLUDED.currency,
        financial_status = EXCLUDED.financial_status,
        fulfillment_status = EXCLUDED.fulfillment_status,
        customer_id = EXCLUDED.customer_id,
        customer_email = EXCLUDED.customer_email,
        customer_first_name = EXCLUDED.customer_first_name,
        customer_last_name = EXCLUDED.customer_last_name,
        line_items = EXCLUDED.line_items,
        line_items_count = EXCLUDED.line_items_count,
        shipping_lines = EXCLUDED.shipping_lines,
        discount_codes = EXCLUDED.discount_codes,
        tags = EXCLUDED.tags,
        note = EXCLUDED.note,
        browser_ip = EXCLUDED.browser_ip,
        gateway = EXCLUDED.gateway,
        user_id = EXCLUDED.user_id,
        bulk_imported = EXCLUDED.bulk_imported,
        last_synced_at = EXCLUDED.last_synced_at;

    GET DIAGNOSTICS rows_affected = ROW_COUNT;
    
    -- Clear staging data after promotion
    DELETE FROM stage.shopify_orders WHERE brand_id = brand_id_param;
    
    RETURN rows_affected;
END;
$$ LANGUAGE plpgsql;

-- Function to promote customers from staging to production
CREATE OR REPLACE FUNCTION promote_customers_to_production(brand_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
    rows_affected INTEGER;
BEGIN
    -- Upsert customers from stage to public
    INSERT INTO public.shopify_customers 
    (customer_id, brand_id, connection_id, email, first_name, last_name, phone, created_at, updated_at,
     orders_count, total_spent, state, tags, currency, accepts_marketing, verified_email, tax_exempt, synced_at)
    SELECT 
        customer_id, brand_id, connection_id, email, first_name, last_name, phone, created_at, updated_at,
        orders_count, total_spent, state, tags, currency, accepts_marketing, verified_email, tax_exempt, synced_at
    FROM stage.shopify_customers 
    WHERE brand_id = brand_id_param
    ON CONFLICT (customer_id, brand_id) 
    DO UPDATE SET
        connection_id = EXCLUDED.connection_id,
        email = EXCLUDED.email,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        phone = EXCLUDED.phone,
        updated_at = EXCLUDED.updated_at,
        orders_count = EXCLUDED.orders_count,
        total_spent = EXCLUDED.total_spent,
        state = EXCLUDED.state,
        tags = EXCLUDED.tags,
        currency = EXCLUDED.currency,
        accepts_marketing = EXCLUDED.accepts_marketing,
        verified_email = EXCLUDED.verified_email,
        tax_exempt = EXCLUDED.tax_exempt,
        synced_at = EXCLUDED.synced_at;

    GET DIAGNOSTICS rows_affected = ROW_COUNT;
    
    -- Clear staging data after promotion
    DELETE FROM stage.shopify_customers WHERE brand_id = brand_id_param;
    
    RETURN rows_affected;
END;
$$ LANGUAGE plpgsql;
