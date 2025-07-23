-- Fix RLS policies for ai_marketing_reports table
-- The original policies referenced a non-existent user_brands table
-- This migration fixes them to use the correct brands table relationship

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their brands' reports" ON ai_marketing_reports;
DROP POLICY IF EXISTS "Users can create reports for their brands" ON ai_marketing_reports;

-- Create corrected policies
-- Users can view reports for brands they own
CREATE POLICY "Users can view their brands' reports" 
  ON ai_marketing_reports
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM brands 
      WHERE brands.id = ai_marketing_reports.brand_id 
      AND brands.user_id = auth.uid()
    )
  );

-- Users can create reports for brands they own
CREATE POLICY "Users can create reports for their brands" 
  ON ai_marketing_reports
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM brands 
      WHERE brands.id = ai_marketing_reports.brand_id 
      AND brands.user_id = auth.uid()
    )
  );

-- Also add UPDATE and DELETE policies for completeness
CREATE POLICY "Users can update their brands' reports" 
  ON ai_marketing_reports
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM brands 
      WHERE brands.id = ai_marketing_reports.brand_id 
      AND brands.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their brands' reports" 
  ON ai_marketing_reports
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM brands 
      WHERE brands.id = ai_marketing_reports.brand_id 
      AND brands.user_id = auth.uid()
    )
  );

-- Add comment explaining the fix
COMMENT ON TABLE ai_marketing_reports IS 'Stores AI-generated marketing reports and analysis - RLS policies fixed to use brands table'; 