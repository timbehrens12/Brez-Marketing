-- Create copy_creatives table for the Copy Creative feature
CREATE TABLE IF NOT EXISTS copy_creatives (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    brand_id UUID NOT NULL,
    user_id TEXT NOT NULL,
    reference_image_url TEXT NOT NULL,
    product_image_url TEXT NOT NULL,
    generated_image_url TEXT DEFAULT '',
    style_analysis TEXT DEFAULT '',
    custom_modifications TEXT DEFAULT '',
    status TEXT DEFAULT 'generating' CHECK (status IN ('analyzing', 'generating', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE copy_creatives ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access copy creatives for brands they own or have access to
CREATE POLICY "Users can access copy creatives for their brands" ON copy_creatives
    FOR ALL
    USING (
        brand_id IN (
            SELECT id FROM brands 
            WHERE user_id = auth.jwt() ->> 'sub'
            OR id IN (
                SELECT brand_id FROM agency_brand_access 
                WHERE user_id = auth.jwt() ->> 'sub'
            )
        )
    );

-- Create indexes for better performance
CREATE INDEX idx_copy_creatives_brand_id ON copy_creatives(brand_id);
CREATE INDEX idx_copy_creatives_user_id ON copy_creatives(user_id);
CREATE INDEX idx_copy_creatives_status ON copy_creatives(status);
CREATE INDEX idx_copy_creatives_created_at ON copy_creatives(created_at DESC);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_copy_creatives_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_copy_creatives_updated_at
    BEFORE UPDATE ON copy_creatives
    FOR EACH ROW
    EXECUTE FUNCTION update_copy_creatives_updated_at();
