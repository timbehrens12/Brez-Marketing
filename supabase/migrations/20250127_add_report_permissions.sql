-- Add can_generate_reports permission field to brand_access table
ALTER TABLE public.brand_access 
ADD COLUMN IF NOT EXISTS can_generate_reports BOOLEAN DEFAULT true;

-- Update existing records to have default permission based on role
UPDATE public.brand_access 
SET can_generate_reports = CASE 
  WHEN role = 'admin' THEN true
  WHEN role = 'media_buyer' THEN true
  WHEN role = 'viewer' THEN false
  ELSE false
END
WHERE can_generate_reports IS NULL;

-- Add comment to explain the field
COMMENT ON COLUMN public.brand_access.can_generate_reports IS 'Whether the user can generate AI marketing reports for this brand';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_brand_access_report_permissions ON public.brand_access(brand_id, can_generate_reports);

-- Add can_generate_reports field to brand_share_links table as well
ALTER TABLE public.brand_share_links 
ADD COLUMN IF NOT EXISTS can_generate_reports BOOLEAN DEFAULT true;

-- Add comment to explain the field
COMMENT ON COLUMN public.brand_share_links.can_generate_reports IS 'Whether the share link grants report generation permissions';

-- Update RLS policies for ai_marketing_reports to support shared brand access
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their brands' reports" ON ai_marketing_reports;
DROP POLICY IF EXISTS "Users can create reports for their brands" ON ai_marketing_reports;
DROP POLICY IF EXISTS "Users can update their brands' reports" ON ai_marketing_reports;
DROP POLICY IF EXISTS "Users can delete their brands' reports" ON ai_marketing_reports;

-- Create new policies that support shared brand access
-- Users can view reports for brands they own OR have access to
CREATE POLICY "Users can view reports for accessible brands" 
  ON ai_marketing_reports
  FOR SELECT 
  USING (
    -- Brand owner can view all reports
    EXISTS (
      SELECT 1 FROM brands 
      WHERE brands.id = ai_marketing_reports.brand_id 
      AND brands.user_id = auth.uid()
    )
    OR
    -- Users with brand access can view reports
    EXISTS (
      SELECT 1 FROM brand_access
      WHERE brand_access.brand_id = ai_marketing_reports.brand_id
      AND brand_access.user_id = auth.uid()::text
      AND brand_access.revoked_at IS NULL
    )
  );

-- Users can create reports for brands they own OR have report generation access to
CREATE POLICY "Users can create reports for accessible brands" 
  ON ai_marketing_reports
  FOR INSERT 
  WITH CHECK (
    -- Brand owner can create reports
    EXISTS (
      SELECT 1 FROM brands 
      WHERE brands.id = ai_marketing_reports.brand_id 
      AND brands.user_id = auth.uid()
    )
    OR
    -- Users with report generation permission can create reports
    EXISTS (
      SELECT 1 FROM brand_access
      WHERE brand_access.brand_id = ai_marketing_reports.brand_id
      AND brand_access.user_id = auth.uid()::text
      AND brand_access.revoked_at IS NULL
      AND brand_access.can_generate_reports = true
    )
  );

-- Users can update reports for brands they own OR have report generation access to
CREATE POLICY "Users can update reports for accessible brands" 
  ON ai_marketing_reports
  FOR UPDATE 
  USING (
    -- Brand owner can update reports
    EXISTS (
      SELECT 1 FROM brands 
      WHERE brands.id = ai_marketing_reports.brand_id 
      AND brands.user_id = auth.uid()
    )
    OR
    -- Users with report generation permission can update reports
    EXISTS (
      SELECT 1 FROM brand_access
      WHERE brand_access.brand_id = ai_marketing_reports.brand_id
      AND brand_access.user_id = auth.uid()::text
      AND brand_access.revoked_at IS NULL
      AND brand_access.can_generate_reports = true
    )
  );

-- Users can delete reports for brands they own OR have report generation access to
CREATE POLICY "Users can delete reports for accessible brands" 
  ON ai_marketing_reports
  FOR DELETE 
  USING (
    -- Brand owner can delete reports
    EXISTS (
      SELECT 1 FROM brands 
      WHERE brands.id = ai_marketing_reports.brand_id 
      AND brands.user_id = auth.uid()
    )
    OR
    -- Users with report generation permission can delete reports
    EXISTS (
      SELECT 1 FROM brand_access
      WHERE brand_access.brand_id = ai_marketing_reports.brand_id
      AND brand_access.user_id = auth.uid()::text
      AND brand_access.revoked_at IS NULL
      AND brand_access.can_generate_reports = true
    )
  );

-- Add comment explaining the enhancement
COMMENT ON TABLE ai_marketing_reports IS 'Stores AI-generated marketing reports and analysis - supports shared brand access with report generation permissions'; 