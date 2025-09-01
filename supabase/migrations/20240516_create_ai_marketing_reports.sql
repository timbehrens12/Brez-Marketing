-- Create a table to store AI-generated marketing reports
CREATE TABLE IF NOT EXISTS ai_marketing_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  date_range_from DATE NOT NULL,
  date_range_to DATE NOT NULL,
  period_name TEXT,
  raw_response TEXT NOT NULL,
  html_report TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  CONSTRAINT fk_brand FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE
);

-- Add indexes for query performance
CREATE INDEX idx_ai_marketing_reports_brand_id ON ai_marketing_reports(brand_id);
CREATE INDEX idx_ai_marketing_reports_user_id ON ai_marketing_reports(user_id);
CREATE INDEX idx_ai_marketing_reports_created_at ON ai_marketing_reports(created_at);

-- Enable Row Level Security
ALTER TABLE ai_marketing_reports ENABLE ROW LEVEL SECURITY;

-- Create policies
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

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp
BEFORE UPDATE ON ai_marketing_reports
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Add comment to the table
COMMENT ON TABLE ai_marketing_reports IS 'Stores AI-generated marketing reports and analysis'; 