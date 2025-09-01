-- Create creative_generations table
CREATE TABLE IF NOT EXISTS creative_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  style_id TEXT NOT NULL,
  style_name TEXT NOT NULL,
  original_image_url TEXT NOT NULL,
  generated_image_url TEXT NOT NULL,
  prompt_used TEXT NOT NULL,
  text_overlays JSONB DEFAULT '{}',
  status TEXT DEFAULT 'completed' CHECK (status IN ('generating', 'completed', 'failed')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_creative_generations_brand_id ON creative_generations(brand_id);
CREATE INDEX IF NOT EXISTS idx_creative_generations_user_id ON creative_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_creative_generations_status ON creative_generations(status);
CREATE INDEX IF NOT EXISTS idx_creative_generations_created_at ON creative_generations(created_at);

-- Add comment to the table
COMMENT ON TABLE creative_generations IS 'Stores AI-generated creative images with brand association';

-- Enable Row Level Security
ALTER TABLE creative_generations ENABLE ROW LEVEL SECURITY;

-- Create policy for users to see creatives for brands they have access to
CREATE POLICY "Users can view creatives for their brands"
  ON creative_generations
  FOR SELECT
  USING (
    brand_id IN (
      SELECT id FROM brands WHERE user_id = auth.uid()
      UNION
      SELECT brand_id FROM brand_access WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Create policy for users to insert creatives for their brands
CREATE POLICY "Users can create creatives for their brands"
  ON creative_generations
  FOR INSERT
  WITH CHECK (
    brand_id IN (
      SELECT id FROM brands WHERE user_id = auth.uid()
      UNION
      SELECT brand_id FROM brand_access WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Create policy for users to update creatives for their brands
CREATE POLICY "Users can update creatives for their brands"
  ON creative_generations
  FOR UPDATE
  USING (
    brand_id IN (
      SELECT id FROM brands WHERE user_id = auth.uid()
      UNION
      SELECT brand_id FROM brand_access WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Create policy for users to delete creatives for their brands
CREATE POLICY "Users can delete creatives for their brands"
  ON creative_generations
  FOR DELETE
  USING (
    brand_id IN (
      SELECT id FROM brands WHERE user_id = auth.uid()
      UNION
      SELECT brand_id FROM brand_access WHERE user_id = auth.uid() AND status = 'active'
    )
  );