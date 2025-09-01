-- Create table for tracking Shopify bulk operations
CREATE TABLE IF NOT EXISTS shopify_bulk_jobs (
  id SERIAL PRIMARY KEY,
  connection_id UUID NOT NULL REFERENCES platform_connections(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL,
  job_id TEXT NOT NULL UNIQUE,
  job_type TEXT NOT NULL CHECK (job_type IN ('orders', 'customers', 'products')),
  status TEXT NOT NULL DEFAULT 'RUNNING' CHECK (status IN ('CREATED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELED')),
  records_processed INTEGER,
  error_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_shopify_bulk_jobs_connection_id ON shopify_bulk_jobs(connection_id);
CREATE INDEX IF NOT EXISTS idx_shopify_bulk_jobs_brand_id ON shopify_bulk_jobs(brand_id);
CREATE INDEX IF NOT EXISTS idx_shopify_bulk_jobs_status ON shopify_bulk_jobs(status);
CREATE INDEX IF NOT EXISTS idx_shopify_bulk_jobs_job_id ON shopify_bulk_jobs(job_id);

-- Add bulk_imported flag to existing Shopify tables to track data source
ALTER TABLE shopify_orders ADD COLUMN IF NOT EXISTS bulk_imported BOOLEAN DEFAULT FALSE;
ALTER TABLE shopify_customers ADD COLUMN IF NOT EXISTS bulk_imported BOOLEAN DEFAULT FALSE;
ALTER TABLE shopify_products ADD COLUMN IF NOT EXISTS bulk_imported BOOLEAN DEFAULT FALSE;

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_shopify_bulk_jobs_modtime ON shopify_bulk_jobs;
CREATE TRIGGER update_shopify_bulk_jobs_modtime 
    BEFORE UPDATE ON shopify_bulk_jobs 
    FOR EACH ROW 
    EXECUTE FUNCTION update_modified_column();

-- Add new sync statuses to platform_connections if not already present
-- Note: This assumes the sync_status column exists and is a text field
-- You may need to adjust based on your actual column constraints

-- Add comment for documentation
COMMENT ON TABLE shopify_bulk_jobs IS 'Tracks Shopify GraphQL bulk operation jobs for historical data import';
COMMENT ON COLUMN shopify_bulk_jobs.job_id IS 'Shopify bulk operation ID from GraphQL API';
COMMENT ON COLUMN shopify_bulk_jobs.job_type IS 'Type of data being imported: orders, customers, or products';
COMMENT ON COLUMN shopify_bulk_jobs.records_processed IS 'Number of records successfully processed from the bulk operation';
COMMENT ON COLUMN shopify_bulk_jobs.error_code IS 'Shopify error code if the bulk operation failed';
