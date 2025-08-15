-- Create meta_demographics table for storing demographic breakdown data from Meta ads
CREATE TABLE meta_demographics (
  id BIGSERIAL PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES platform_connections(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL,
  account_name TEXT,
  breakdown_type TEXT NOT NULL CHECK (breakdown_type IN ('age', 'gender', 'age_gender')),
  breakdown_value TEXT NOT NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  spend DECIMAL(12, 2) DEFAULT 0,
  reach INTEGER DEFAULT 0,
  cpm DECIMAL(8, 2) DEFAULT 0,
  cpc DECIMAL(8, 2) DEFAULT 0,
  ctr DECIMAL(8, 4) DEFAULT 0,
  date_range_start DATE NOT NULL,
  date_range_end DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_meta_demographics_brand_id ON meta_demographics(brand_id);
CREATE INDEX idx_meta_demographics_connection_id ON meta_demographics(connection_id);
CREATE INDEX idx_meta_demographics_breakdown_type ON meta_demographics(breakdown_type);
CREATE INDEX idx_meta_demographics_date_range ON meta_demographics(date_range_start, date_range_end);
CREATE INDEX idx_meta_demographics_account_id ON meta_demographics(account_id);

-- Create composite index for common queries
CREATE INDEX idx_meta_demographics_brand_type_date ON meta_demographics(brand_id, breakdown_type, date_range_start, date_range_end);

-- Add RLS policies
ALTER TABLE meta_demographics ENABLE ROW LEVEL SECURITY;

-- Users can only access their own brand's data
CREATE POLICY "Users can view their own brand demographics" ON meta_demographics
  FOR SELECT USING (
    brand_id IN (
      SELECT id FROM brands WHERE user_id = auth.uid()
    )
  );

-- Users with brand access can also view demographic data
CREATE POLICY "Brand access users can view demographics" ON meta_demographics
  FOR SELECT USING (
    brand_id IN (
      SELECT ba.brand_id 
      FROM brand_access ba 
      JOIN brands b ON ba.brand_id = b.id
      WHERE ba.user_id = auth.uid()
    )
  );
