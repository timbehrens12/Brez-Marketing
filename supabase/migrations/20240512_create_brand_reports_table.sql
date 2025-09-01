-- Create the brand_reports table to store generated reports
CREATE TABLE IF NOT EXISTS public.brand_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL,
  period VARCHAR(20) NOT NULL CHECK (period IN ('daily', 'monthly')),
  report_content TEXT NOT NULL,
  date_range_start DATE NOT NULL,
  date_range_end DATE NOT NULL,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Create a unique constraint to ensure only one report per brand per period
  CONSTRAINT unique_brand_period UNIQUE (brand_id, period)
);

-- Add foreign key if brands table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'brands') THEN
    ALTER TABLE public.brand_reports 
    ADD CONSTRAINT brand_reports_brand_id_fkey 
    FOREIGN KEY (brand_id) REFERENCES public.brands(id) ON DELETE CASCADE;
  END IF;
END$$;

-- Add RLS policies
ALTER TABLE public.brand_reports ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own brand reports
CREATE POLICY "Users can read their own brand reports" ON public.brand_reports
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.brands b
      WHERE b.id = brand_reports.brand_id
      AND b.user_id::text = auth.uid()::text
    )
  );

-- Create specific policies for the service role
CREATE POLICY "Service role can insert reports" ON public.brand_reports
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update reports" ON public.brand_reports
  FOR UPDATE
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can delete reports" ON public.brand_reports
  FOR DELETE
  USING (auth.role() = 'service_role');

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_brand_reports_brand_id ON public.brand_reports(brand_id);

COMMENT ON TABLE public.brand_reports IS 'Stores AI-generated business reports for each brand'; 