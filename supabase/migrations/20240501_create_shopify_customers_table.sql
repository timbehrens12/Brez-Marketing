-- Create shopify_customers table
CREATE TABLE IF NOT EXISTS shopify_customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connection_id UUID NOT NULL REFERENCES platform_connections(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  orders_count INTEGER,
  total_spent DECIMAL(10, 2),
  currency TEXT,
  state TEXT,
  tags JSONB,
  tax_exempt BOOLEAN,
  phone TEXT,
  addresses JSONB,
  default_address JSONB,
  accepts_marketing BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  last_order_id TEXT,
  last_order_date TIMESTAMP WITH TIME ZONE,
  note TEXT,
  verified_email BOOLEAN,
  multipass_identifier TEXT,
  tax_exemptions JSONB,
  
  -- Additional calculated metrics
  lifetime_value DECIMAL(10, 2),
  average_order_value DECIMAL(10, 2),
  purchase_frequency DECIMAL(10, 2),
  days_since_last_order INTEGER,
  is_returning_customer BOOLEAN,
  acquisition_source TEXT,
  geographic_region TEXT,
  customer_segment TEXT,
  
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Create a unique constraint on connection_id and customer_id
  UNIQUE(connection_id, customer_id)
);

-- Create indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_shopify_customers_connection_id ON shopify_customers(connection_id);
CREATE INDEX IF NOT EXISTS idx_shopify_customers_customer_segment ON shopify_customers(customer_segment);
CREATE INDEX IF NOT EXISTS idx_shopify_customers_geographic_region ON shopify_customers(geographic_region);
CREATE INDEX IF NOT EXISTS idx_shopify_customers_is_returning_customer ON shopify_customers(is_returning_customer);

-- Add comment to the table
COMMENT ON TABLE shopify_customers IS 'Stores Shopify customer data with additional calculated metrics for analytics'; 