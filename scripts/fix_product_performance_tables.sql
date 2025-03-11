-- Fixed Product Performance Tracking Tables
-- This script fixes the type mismatch issues in the original script

-- Table for tracking product views
CREATE TABLE IF NOT EXISTS public.product_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL,
  connection_id TEXT NOT NULL, -- Changed from UUID to TEXT to avoid type casting issues
  brand_id UUID NOT NULL,
  customer_id TEXT,
  session_id TEXT NOT NULL,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  source TEXT, -- where the view came from (search, category page, recommendation, etc.)
  device_type TEXT, -- mobile, desktop, tablet
  time_spent_seconds INTEGER, -- how long they viewed the product
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for tracking product returns
CREATE TABLE IF NOT EXISTS public.product_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  variant_id TEXT,
  connection_id TEXT NOT NULL, -- Changed from UUID to TEXT
  brand_id UUID NOT NULL,
  customer_id TEXT,
  quantity INTEGER NOT NULL,
  return_reason TEXT,
  return_status TEXT NOT NULL, -- requested, approved, received, refunded
  returned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  refunded_amount DECIMAL(10, 2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for tracking product relationships (cross-sells, upsells)
CREATE TABLE IF NOT EXISTS public.product_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL,
  related_product_id TEXT NOT NULL,
  connection_id TEXT NOT NULL, -- Changed from UUID to TEXT
  brand_id UUID NOT NULL,
  relationship_type TEXT NOT NULL, -- cross-sell, upsell, frequently_bought_together
  strength INTEGER, -- calculated value representing how strong the relationship is (1-100)
  conversion_rate DECIMAL(5, 2), -- percentage of times the related product was purchased
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_id, related_product_id, connection_id, relationship_type)
);

-- Table for tracking inventory turnover
CREATE TABLE IF NOT EXISTS public.inventory_turnover (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL,
  variant_id TEXT,
  connection_id TEXT NOT NULL, -- Changed from UUID to TEXT
  brand_id UUID NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  beginning_inventory INTEGER NOT NULL,
  ending_inventory INTEGER NOT NULL,
  units_sold INTEGER NOT NULL,
  turnover_rate DECIMAL(10, 2), -- calculated field: units_sold / ((beginning_inventory + ending_inventory) / 2)
  days_to_sell_through INTEGER, -- estimated days to sell through current inventory
  restock_recommendation BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_id, variant_id, connection_id, period_start, period_end)
);

-- Table for product reviews
CREATE TABLE IF NOT EXISTS public.product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL,
  connection_id TEXT NOT NULL, -- Changed from UUID to TEXT
  brand_id UUID NOT NULL,
  customer_id TEXT,
  order_id TEXT,
  rating INTEGER NOT NULL, -- 1-5 stars
  review_title TEXT,
  review_text TEXT,
  sentiment_score DECIMAL(3, 2), -- calculated field: -1.0 to 1.0 representing sentiment
  verified_purchase BOOLEAN DEFAULT FALSE,
  helpful_votes INTEGER DEFAULT 0,
  published BOOLEAN DEFAULT TRUE,
  reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for aggregated product performance metrics
CREATE TABLE IF NOT EXISTS public.product_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL,
  connection_id TEXT NOT NULL, -- Changed from UUID to TEXT
  brand_id UUID NOT NULL,
  product_name TEXT NOT NULL,
  sku TEXT,
  views_count INTEGER DEFAULT 0,
  purchases_count INTEGER DEFAULT 0,
  view_to_purchase_ratio DECIMAL(10, 2) DEFAULT 0,
  return_rate DECIMAL(5, 2) DEFAULT 0,
  average_rating DECIMAL(3, 2) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  inventory_turnover_rate DECIMAL(10, 2) DEFAULT 0,
  revenue_generated DECIMAL(12, 2) DEFAULT 0,
  profit_margin DECIMAL(5, 2) DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_id, connection_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_product_views_product_id ON public.product_views(product_id);
CREATE INDEX IF NOT EXISTS idx_product_views_connection_id ON public.product_views(connection_id);
CREATE INDEX IF NOT EXISTS idx_product_views_brand_id ON public.product_views(brand_id);
CREATE INDEX IF NOT EXISTS idx_product_views_viewed_at ON public.product_views(viewed_at);

CREATE INDEX IF NOT EXISTS idx_product_returns_product_id ON public.product_returns(product_id);
CREATE INDEX IF NOT EXISTS idx_product_returns_connection_id ON public.product_returns(connection_id);
CREATE INDEX IF NOT EXISTS idx_product_returns_brand_id ON public.product_returns(brand_id);
CREATE INDEX IF NOT EXISTS idx_product_returns_order_id ON public.product_returns(order_id);

CREATE INDEX IF NOT EXISTS idx_product_relationships_product_id ON public.product_relationships(product_id);
CREATE INDEX IF NOT EXISTS idx_product_relationships_related_product_id ON public.product_relationships(related_product_id);
CREATE INDEX IF NOT EXISTS idx_product_relationships_connection_id ON public.product_relationships(connection_id);
CREATE INDEX IF NOT EXISTS idx_product_relationships_brand_id ON public.product_relationships(brand_id);

CREATE INDEX IF NOT EXISTS idx_inventory_turnover_product_id ON public.inventory_turnover(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_turnover_connection_id ON public.inventory_turnover(connection_id);
CREATE INDEX IF NOT EXISTS idx_inventory_turnover_brand_id ON public.inventory_turnover(brand_id);
CREATE INDEX IF NOT EXISTS idx_inventory_turnover_period_end ON public.inventory_turnover(period_end);

CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON public.product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_connection_id ON public.product_reviews(connection_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_brand_id ON public.product_reviews(brand_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_rating ON public.product_reviews(rating);

CREATE INDEX IF NOT EXISTS idx_product_performance_metrics_product_id ON public.product_performance_metrics(product_id);
CREATE INDEX IF NOT EXISTS idx_product_performance_metrics_connection_id ON public.product_performance_metrics(connection_id);
CREATE INDEX IF NOT EXISTS idx_product_performance_metrics_brand_id ON public.product_performance_metrics(brand_id);

-- Enable Row Level Security
ALTER TABLE public.product_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_turnover ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_performance_metrics ENABLE ROW LEVEL SECURITY;

-- Create simple RLS policies that avoid type casting issues
CREATE POLICY "Allow all operations for authenticated users on product_views"
  ON public.product_views
  FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Allow all operations for authenticated users on product_returns"
  ON public.product_returns
  FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Allow all operations for authenticated users on product_relationships"
  ON public.product_relationships
  FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Allow all operations for authenticated users on inventory_turnover"
  ON public.inventory_turnover
  FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Allow all operations for authenticated users on product_reviews"
  ON public.product_reviews
  FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Allow all operations for authenticated users on product_performance_metrics"
  ON public.product_performance_metrics
  FOR ALL
  TO authenticated
  USING (true);

-- Add comments to tables
COMMENT ON TABLE public.product_views IS 'Tracks when products are viewed by customers';
COMMENT ON TABLE public.product_returns IS 'Tracks product returns and reasons';
COMMENT ON TABLE public.product_relationships IS 'Tracks which products are commonly purchased together';
COMMENT ON TABLE public.inventory_turnover IS 'Tracks how quickly products sell through inventory';
COMMENT ON TABLE public.product_reviews IS 'Stores customer reviews and ratings for products';
COMMENT ON TABLE public.product_performance_metrics IS 'Aggregated metrics about product performance'; 