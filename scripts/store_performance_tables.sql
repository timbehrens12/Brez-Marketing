-- Store Performance Tables

-- Table for page performance metrics
CREATE TABLE IF NOT EXISTS page_performance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id),
  connection_id UUID REFERENCES platform_connections(id),
  page_url TEXT NOT NULL,
  page_type TEXT, -- 'product', 'collection', 'homepage', 'cart', 'checkout', etc.
  views INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  avg_time_on_page DECIMAL(10, 2), -- in seconds
  bounce_rate DECIMAL(5, 2), -- percentage
  load_time DECIMAL(10, 2), -- in milliseconds
  date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(connection_id, page_url, date)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_page_performance_brand_id ON page_performance(brand_id);
CREATE INDEX IF NOT EXISTS idx_page_performance_connection_id ON page_performance(connection_id);
CREATE INDEX IF NOT EXISTS idx_page_performance_page_type ON page_performance(page_type);
CREATE INDEX IF NOT EXISTS idx_page_performance_date ON page_performance(date);

-- Table for checkout funnel analytics
CREATE TABLE IF NOT EXISTS checkout_funnel (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id),
  connection_id UUID REFERENCES platform_connections(id),
  funnel_stage TEXT NOT NULL, -- 'cart_view', 'checkout_started', 'shipping_info', 'payment_info', 'completed'
  visitors INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5, 2), -- percentage to next stage
  abandonment_rate DECIMAL(5, 2), -- percentage who left at this stage
  avg_time_in_stage DECIMAL(10, 2), -- in seconds
  date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(connection_id, funnel_stage, date)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_checkout_funnel_brand_id ON checkout_funnel(brand_id);
CREATE INDEX IF NOT EXISTS idx_checkout_funnel_connection_id ON checkout_funnel(connection_id);
CREATE INDEX IF NOT EXISTS idx_checkout_funnel_funnel_stage ON checkout_funnel(funnel_stage);
CREATE INDEX IF NOT EXISTS idx_checkout_funnel_date ON checkout_funnel(date);

-- Table for search analytics
CREATE TABLE IF NOT EXISTS search_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id),
  connection_id UUID REFERENCES platform_connections(id),
  search_term TEXT NOT NULL,
  search_count INTEGER DEFAULT 0,
  results_count INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5, 2), -- percentage of searches that led to purchase
  click_through_rate DECIMAL(5, 2), -- percentage of searches that led to product view
  zero_results BOOLEAN DEFAULT FALSE, -- whether search returned no results
  date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_search_analytics_brand_id ON search_analytics(brand_id);
CREATE INDEX IF NOT EXISTS idx_search_analytics_connection_id ON search_analytics(connection_id);
CREATE INDEX IF NOT EXISTS idx_search_analytics_search_term ON search_analytics(search_term);
CREATE INDEX IF NOT EXISTS idx_search_analytics_date ON search_analytics(date);

-- Table for device and browser analytics
CREATE TABLE IF NOT EXISTS device_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id),
  connection_id UUID REFERENCES platform_connections(id),
  device_type TEXT NOT NULL, -- 'desktop', 'mobile', 'tablet'
  browser TEXT, -- 'chrome', 'safari', 'firefox', etc.
  operating_system TEXT,
  screen_resolution TEXT,
  visitors INTEGER DEFAULT 0,
  sessions INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5, 2), -- percentage of sessions that led to purchase
  bounce_rate DECIMAL(5, 2), -- percentage of single-page sessions
  avg_session_duration DECIMAL(10, 2), -- in seconds
  date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(connection_id, device_type, browser, operating_system, date)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_device_analytics_brand_id ON device_analytics(brand_id);
CREATE INDEX IF NOT EXISTS idx_device_analytics_connection_id ON device_analytics(connection_id);
CREATE INDEX IF NOT EXISTS idx_device_analytics_device_type ON device_analytics(device_type);
CREATE INDEX IF NOT EXISTS idx_device_analytics_browser ON device_analytics(browser);
CREATE INDEX IF NOT EXISTS idx_device_analytics_date ON device_analytics(date);

-- Enable RLS on all tables
ALTER TABLE page_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkout_funnel ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_analytics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for each table
CREATE POLICY "Users can view their own page performance data"
  ON page_performance
  FOR SELECT
  USING (brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid()));

CREATE POLICY "Users can view their own checkout funnel data"
  ON checkout_funnel
  FOR SELECT
  USING (brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid()));

CREATE POLICY "Users can view their own search analytics data"
  ON search_analytics
  FOR SELECT
  USING (brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid()));

CREATE POLICY "Users can view their own device analytics data"
  ON device_analytics
  FOR SELECT
  USING (brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid()));

-- Create policies for insert/update/delete operations
CREATE POLICY "Users can insert their own page performance data"
  ON page_performance
  FOR INSERT
  WITH CHECK (brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their own page performance data"
  ON page_performance
  FOR UPDATE
  USING (brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid()));

-- Repeat similar policies for other tables 