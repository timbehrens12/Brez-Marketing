-- Enhanced Shopify Orders Table
-- Add comprehensive fields for better AI insights

ALTER TABLE shopify_orders 
ADD COLUMN IF NOT EXISTS order_number INTEGER,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS subtotal_price NUMERIC,
ADD COLUMN IF NOT EXISTS total_discounts NUMERIC,
ADD COLUMN IF NOT EXISTS total_tax NUMERIC,
ADD COLUMN IF NOT EXISTS currency TEXT,
ADD COLUMN IF NOT EXISTS financial_status TEXT,
ADD COLUMN IF NOT EXISTS fulfillment_status TEXT,
ADD COLUMN IF NOT EXISTS customer_email TEXT,
ADD COLUMN IF NOT EXISTS shipping_lines JSONB,
ADD COLUMN IF NOT EXISTS discount_codes JSONB,
ADD COLUMN IF NOT EXISTS tags TEXT,
ADD COLUMN IF NOT EXISTS note TEXT,
ADD COLUMN IF NOT EXISTS browser_ip TEXT,
ADD COLUMN IF NOT EXISTS gateway TEXT;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_shopify_orders_financial_status ON shopify_orders(financial_status);
CREATE INDEX IF NOT EXISTS idx_shopify_orders_fulfillment_status ON shopify_orders(fulfillment_status);
CREATE INDEX IF NOT EXISTS idx_shopify_orders_total_price ON shopify_orders(total_price);
CREATE INDEX IF NOT EXISTS idx_shopify_orders_created_at ON shopify_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_shopify_orders_customer_email ON shopify_orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_shopify_orders_currency ON shopify_orders(currency);

-- Add comments for documentation
COMMENT ON COLUMN shopify_orders.order_number IS 'Sequential order number for display';
COMMENT ON COLUMN shopify_orders.financial_status IS 'Payment status: paid, pending, refunded, etc.';
COMMENT ON COLUMN shopify_orders.fulfillment_status IS 'Shipping status: fulfilled, unfulfilled, etc.';
COMMENT ON COLUMN shopify_orders.shipping_lines IS 'Shipping method and cost details';
COMMENT ON COLUMN shopify_orders.discount_codes IS 'Applied discount codes and amounts';
