-- Create cron_job_logs table to track automated job executions
CREATE TABLE IF NOT EXISTS public.cron_job_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_name VARCHAR(255) NOT NULL,
    execution_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    brands_processed INTEGER DEFAULT 0,
    total_records_backfilled INTEGER DEFAULT 0,
    results JSONB,
    success BOOLEAN DEFAULT false,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_cron_job_logs_job_name ON public.cron_job_logs(job_name);
CREATE INDEX IF NOT EXISTS idx_cron_job_logs_execution_time ON public.cron_job_logs(execution_time);
CREATE INDEX IF NOT EXISTS idx_cron_job_logs_success ON public.cron_job_logs(success);

-- Enable RLS
ALTER TABLE public.cron_job_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policy to allow service to insert logs
CREATE POLICY "Service can insert cron job logs" ON public.cron_job_logs
    FOR INSERT WITH CHECK (true);

-- Create RLS policy to allow admins to view logs
CREATE POLICY "Admins can view cron job logs" ON public.cron_job_logs
    FOR SELECT USING (true);

-- Add comments for documentation
COMMENT ON TABLE public.cron_job_logs IS 'Tracks automated cron job executions for monitoring and debugging';
COMMENT ON COLUMN public.cron_job_logs.job_name IS 'Name of the cron job that was executed';
COMMENT ON COLUMN public.cron_job_logs.execution_time IS 'When the cron job was executed';
COMMENT ON COLUMN public.cron_job_logs.brands_processed IS 'Number of brands processed during the job';
COMMENT ON COLUMN public.cron_job_logs.total_records_backfilled IS 'Total number of records added during the job';
COMMENT ON COLUMN public.cron_job_logs.results IS 'JSON containing detailed execution results';
COMMENT ON COLUMN public.cron_job_logs.success IS 'Whether the cron job completed successfully';
COMMENT ON COLUMN public.cron_job_logs.error IS 'Error message if the job failed'; 