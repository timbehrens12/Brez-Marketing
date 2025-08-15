-- Create meta_device_performance table for storing device/placement breakdown data from Meta ads
CREATE TABLE meta_device_performance (
  id BIGSERIAL PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES platform_connections(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL,
  account_name TEXT,
  breakdown_type TEXT NOT NULL CHECK (breakdown_type IN ('device', 'placement', 'platform')),
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
CREATE INDEX idx_meta_device_performance_brand_id ON meta_device_performance(brand_id);
CREATE INDEX idx_meta_device_performance_connection_id ON meta_device_performance(connection_id);
CREATE INDEX idx_meta_device_performance_breakdown_type ON meta_device_performance(breakdown_type);
CREATE INDEX idx_meta_device_performance_date_range ON meta_device_performance(date_range_start, date_range_end);
CREATE INDEX idx_meta_device_performance_account_id ON meta_device_performance(account_id);

-- Create composite index for common queries
CREATE INDEX idx_meta_device_performance_brand_type_date ON meta_device_performance(brand_id, breakdown_type, date_range_start, date_range_end);

-- Add RLS policies
ALTER TABLE meta_device_performance ENABLE ROW LEVEL SECURITY;

-- Users can only access their own brand's data
CREATE POLICY "Users can view their own brand device performance" ON meta_device_performance
  FOR SELECT USING (
    brand_id IN (
      SELECT id FROM brands WHERE user_id = auth.uid()
    )
  );

-- Users with brand access can also view device performance data
CREATE POLICY "Brand access users can view device performance" ON meta_device_performance
  FOR SELECT USING (
    brand_id IN (
      SELECT ba.brand_id 
      FROM brand_access ba 
      JOIN brands b ON ba.brand_id = b.id
      WHERE ba.user_id = auth.uid()
    )
  );
