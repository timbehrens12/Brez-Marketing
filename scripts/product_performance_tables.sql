-- Product Performance Tables

-- Table for product views and conversion tracking
CREATE TABLE IF NOT EXISTS product_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id),
  connection_id UUID REFERENCES platform_connections(id),
  product_id TEXT NOT NULL,
  variant_id TEXT,
  view_count INTEGER DEFAULT 0,
  purchase_count INTEGER DEFAULT 0,
  view_to_purchase_ratio DECIMAL(10, 4),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_product_views_brand_id ON product_views(brand_id);
CREATE INDEX IF NOT EXISTS idx_product_views_connection_id ON product_views(connection_id);
CREATE INDEX IF NOT EXISTS idx_product_views_product_id ON product_views(product_id);

-- Table for product returns
CREATE TABLE IF NOT EXISTS product_returns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id),
  connection_id UUID REFERENCES platform_connections(id),
  product_id TEXT NOT NULL,
  variant_id TEXT,
  order_id TEXT,
  return_date TIMESTAMP WITH TIME ZONE,
  return_reason TEXT,
  quantity INTEGER DEFAULT 1,
  refund_amount DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_product_returns_brand_id ON product_returns(brand_id);
CREATE INDEX IF NOT EXISTS idx_product_returns_connection_id ON product_returns(connection_id);
CREATE INDEX IF NOT EXISTS idx_product_returns_product_id ON product_returns(product_id);

-- Table for product relationships (cross-sell/upsell)
CREATE TABLE IF NOT EXISTS product_relationships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id),
  connection_id UUID REFERENCES platform_connections(id),
  primary_product_id TEXT NOT NULL,
  related_product_id TEXT NOT NULL,
  relationship_type TEXT, -- 'cross-sell', 'upsell', 'frequently-bought-together'
  strength INTEGER, -- number of times these products were purchased together
  conversion_rate DECIMAL(10, 4), -- rate at which related product is purchased when primary is viewed
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(connection_id, primary_product_id, related_product_id, relationship_type)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_product_relationships_brand_id ON product_relationships(brand_id);
CREATE INDEX IF NOT EXISTS idx_product_relationships_connection_id ON product_relationships(connection_id);
CREATE INDEX IF NOT EXISTS idx_product_relationships_primary_product_id ON product_relationships(primary_product_id);
CREATE INDEX IF NOT EXISTS idx_product_relationships_related_product_id ON product_relationships(related_product_id);

-- Table for inventory turnover
CREATE TABLE IF NOT EXISTS inventory_turnover (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id),
  connection_id UUID REFERENCES platform_connections(id),
  product_id TEXT NOT NULL,
  variant_id TEXT,
  beginning_inventory INTEGER,
  ending_inventory INTEGER,
  units_sold INTEGER,
  turnover_rate DECIMAL(10, 4),
  period_start DATE,
  period_end DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_inventory_turnover_brand_id ON inventory_turnover(brand_id);
CREATE INDEX IF NOT EXISTS idx_inventory_turnover_connection_id ON inventory_turnover(connection_id);
CREATE INDEX IF NOT EXISTS idx_inventory_turnover_product_id ON inventory_turnover(product_id);

-- Table for product reviews
CREATE TABLE IF NOT EXISTS product_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id),
  connection_id UUID REFERENCES platform_connections(id),
  product_id TEXT NOT NULL,
  variant_id TEXT,
  customer_id TEXT,
  rating INTEGER, -- 1-5 stars
  review_text TEXT,
  sentiment_score DECIMAL(3, 2), -- -1.0 to 1.0 sentiment analysis score
  review_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_product_reviews_brand_id ON product_reviews(brand_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_connection_id ON product_reviews(connection_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_rating ON product_reviews(rating);

-- Enable RLS on all tables
ALTER TABLE product_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_turnover ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for each table
CREATE POLICY "Users can view their own product views data"
  ON product_views
  FOR SELECT
  USING (brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid()));

CREATE POLICY "Users can view their own product returns data"
  ON product_returns
  FOR SELECT
  USING (brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid()));

CREATE POLICY "Users can view their own product relationships data"
  ON product_relationships
  FOR SELECT
  USING (brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid()));

CREATE POLICY "Users can view their own inventory turnover data"
  ON inventory_turnover
  FOR SELECT
  USING (brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid()));

CREATE POLICY "Users can view their own product reviews data"
  ON product_reviews
  FOR SELECT
  USING (brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid()));

-- Create policies for insert/update/delete operations
CREATE POLICY "Users can insert their own product data"
  ON product_views
  FOR INSERT
  WITH CHECK (brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their own product data"
  ON product_views
  FOR UPDATE
  USING (brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid()));

-- Repeat similar policies for other tables 