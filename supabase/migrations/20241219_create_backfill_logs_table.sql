-- Create backfill_logs table to track data backfill operations
CREATE TABLE IF NOT EXISTS public.backfill_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
    gaps_detected INTEGER NOT NULL DEFAULT 0,
    gaps_processed INTEGER NOT NULL DEFAULT 0,
    records_backfilled INTEGER NOT NULL DEFAULT 0,
    auto_detected BOOLEAN NOT NULL DEFAULT true,
    detection_results JSONB,
    backfill_results JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_backfill_logs_brand_id ON public.backfill_logs(brand_id);
CREATE INDEX IF NOT EXISTS idx_backfill_logs_created_at ON public.backfill_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_backfill_logs_records_backfilled ON public.backfill_logs(records_backfilled);

-- Enable RLS
ALTER TABLE public.backfill_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policy to allow users to see logs for their brands
CREATE POLICY "Users can view backfill logs for their brands" ON public.backfill_logs
    FOR SELECT USING (
        brand_id IN (
            SELECT id FROM public.brands 
            WHERE user_id = auth.uid()
        )
    );

-- Create RLS policy to allow inserting backfill logs
CREATE POLICY "Service can insert backfill logs" ON public.backfill_logs
    FOR INSERT WITH CHECK (true);

-- Add comments for documentation
COMMENT ON TABLE public.backfill_logs IS 'Tracks data backfill operations for monitoring and debugging';
COMMENT ON COLUMN public.backfill_logs.brand_id IS 'Reference to the brand for which backfill was performed';
COMMENT ON COLUMN public.backfill_logs.gaps_detected IS 'Number of data gaps detected during the operation';
COMMENT ON COLUMN public.backfill_logs.gaps_processed IS 'Number of gaps that were processed/attempted';
COMMENT ON COLUMN public.backfill_logs.records_backfilled IS 'Total number of records added during backfill';
COMMENT ON COLUMN public.backfill_logs.auto_detected IS 'Whether gaps were auto-detected or manually specified';
COMMENT ON COLUMN public.backfill_logs.detection_results IS 'JSON containing detailed gap detection results';
COMMENT ON COLUMN public.backfill_logs.backfill_results IS 'JSON containing detailed backfill operation results'; 