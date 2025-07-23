-- Fix data type mismatch in ai_marketing_reports table
-- The brand_id column is TEXT but should be UUID to match the brands table

-- First, drop the existing foreign key constraint
ALTER TABLE ai_marketing_reports 
DROP CONSTRAINT fk_brand;

-- Convert the brand_id column from TEXT to UUID
ALTER TABLE ai_marketing_reports
ALTER COLUMN brand_id TYPE UUID USING brand_id::UUID;

-- Re-create the foreign key constraint
ALTER TABLE ai_marketing_reports
ADD CONSTRAINT fk_brand FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE;

-- Add comment to explain the migration
COMMENT ON TABLE ai_marketing_reports IS 'Stores AI-generated marketing reports and analysis with UUID brand_id'; 