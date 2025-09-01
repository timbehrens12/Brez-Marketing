-- Create control schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS control;

-- Create ETL job tracking table
CREATE TABLE IF NOT EXISTS control.etl_job (
    id SERIAL PRIMARY KEY,
    brand_id UUID NOT NULL REFERENCES brands(id),
    entity VARCHAR(50) NOT NULL, -- 'orders', 'customers', 'products', 'recent_sync'
    job_type VARCHAR(50) NOT NULL, -- 'recent_sync', 'bulk_orders', etc.
    status VARCHAR(20) NOT NULL DEFAULT 'queued', -- 'queued', 'running', 'completed', 'failed'
    shopify_bulk_id VARCHAR(255), -- Shopify bulk operation ID
    rows_written INTEGER DEFAULT 0,
    total_rows INTEGER,
    progress_pct INTEGER DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_etl_job_brand_id ON control.etl_job(brand_id);
CREATE INDEX IF NOT EXISTS idx_etl_job_status ON control.etl_job(status);
CREATE INDEX IF NOT EXISTS idx_etl_job_entity ON control.etl_job(entity);
CREATE INDEX IF NOT EXISTS idx_etl_job_type ON control.etl_job(job_type);

-- Create RPC function to get ETL jobs for a brand (for sync status API)
CREATE OR REPLACE FUNCTION get_etl_jobs_for_brand(brand_id_param UUID)
RETURNS TABLE (
    id INTEGER,
    entity VARCHAR(50),
    job_type VARCHAR(50),
    status VARCHAR(20),
    rows_written INTEGER,
    total_rows INTEGER,
    progress_pct INTEGER,
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT 
        j.id,
        j.entity,
        j.job_type,
        j.status,
        j.rows_written,
        j.total_rows,
        j.progress_pct,
        j.error_message,
        j.started_at,
        j.completed_at,
        j.updated_at
    FROM control.etl_job j
    WHERE j.brand_id = brand_id_param
    ORDER BY j.created_at DESC;
$$;

-- Grant permissions to authenticated users
GRANT USAGE ON SCHEMA control TO authenticated;
GRANT ALL ON control.etl_job TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE control.etl_job_id_seq TO authenticated;
GRANT EXECUTE ON FUNCTION get_etl_jobs_for_brand(UUID) TO authenticated;

-- Enable RLS
ALTER TABLE control.etl_job ENABLE ROW LEVEL SECURITY;

-- Create RLS policy so users can only see their own brand's ETL jobs
CREATE POLICY "Users can view ETL jobs for their brands" ON control.etl_job
    FOR ALL USING (
        brand_id IN (
            SELECT b.id FROM brands b 
            WHERE b.user_id = auth.uid()
        )
    );

COMMENT ON TABLE control.etl_job IS 'Tracks ETL job progress for queue-based Shopify sync system';
COMMENT ON COLUMN control.etl_job.entity IS 'Data entity being synced: orders, customers, products, recent_sync';
COMMENT ON COLUMN control.etl_job.job_type IS 'Type of job: recent_sync, bulk_orders, bulk_customers, bulk_products';
COMMENT ON COLUMN control.etl_job.shopify_bulk_id IS 'Shopify GraphQL bulk operation ID for tracking';
COMMENT ON FUNCTION get_etl_jobs_for_brand(UUID) IS 'Returns ETL jobs for a specific brand - used by sync status API';
