-- Drop existing policies to recreate them with proper type casting
DROP POLICY IF EXISTS "Users can read their own brand reports" ON public.brand_reports;
DROP POLICY IF EXISTS "Service role can manage reports" ON public.brand_reports;

-- Recreate policies with explicit type casting
CREATE POLICY "Users can read their own brand reports" ON public.brand_reports
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.brands b
      WHERE b.id = brand_reports.brand_id
      AND b.user_id::text = auth.uid()::text
    )
  );

-- Create a more specific policy for the service role
CREATE POLICY "Service role can insert reports" ON public.brand_reports
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update reports" ON public.brand_reports
  FOR UPDATE
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can delete reports" ON public.brand_reports
  FOR DELETE
  USING (auth.role() = 'service_role'); 