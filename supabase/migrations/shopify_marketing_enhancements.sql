-- Shopify Marketing Enhancement Tables
-- These tables will provide critical data for AI-powered marketing optimization

-- 1. Product Performance & Analytics
CREATE TABLE IF NOT EXISTS shopify_product_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connection_id UUID NOT NULL REFERENCES platform_connections(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  variant_id TEXT,
  title TEXT,
  handle TEXT,
  product_type TEXT,
  vendor TEXT,

  -- Performance Metrics (30-day rolling)
  views INTEGER DEFAULT 0,
  add_to_carts INTEGER DEFAULT 0,
  purchases INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5, 2) DEFAULT 0.00,
  revenue DECIMAL(10, 2) DEFAULT 0.00,
  profit_margin DECIMAL(5, 2) DEFAULT 0.00,

  -- Search & Discovery
  search_impressions INTEGER DEFAULT 0,
  search_clicks INTEGER DEFAULT 0,
  search_ctr DECIMAL(5, 2) DEFAULT 0.00,

  -- Social Proof
  reviews_count INTEGER DEFAULT 0,
  average_rating DECIMAL(3, 2) DEFAULT 0.00,
  featured_on_homepage BOOLEAN DEFAULT false,

  -- Inventory Intelligence
  stock_level INTEGER DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 10,
  out_of_stock_count INTEGER DEFAULT 0,
  restock_date DATE,

  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(connection_id, product_id)
);

-- 2. Customer Journey & Funnel Analytics
CREATE TABLE IF NOT EXISTS shopify_customer_journey (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connection_id UUID NOT NULL REFERENCES platform_connections(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL,
  session_id TEXT,

  -- Journey Steps
  first_touch_point TEXT, -- organic, paid, referral, etc.
  first_touch_timestamp TIMESTAMP WITH TIME ZONE,
  last_touch_point TEXT,
  last_touch_timestamp TIMESTAMP WITH TIME ZONE,

  -- Conversion Path
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,

  -- Behavioral Data
  pages_viewed JSONB,
  products_viewed JSONB,
  cart_additions JSONB,
  time_spent_seconds INTEGER,
  bounce_rate BOOLEAN DEFAULT false,

  -- Device & Context
  device_type TEXT, -- desktop, mobile, tablet
  browser TEXT,
  operating_system TEXT,
  referrer TEXT,

  conversion_occurred BOOLEAN DEFAULT false,
  conversion_timestamp TIMESTAMP WITH TIME ZONE,
  order_id TEXT,

  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Content Performance & SEO
CREATE TABLE IF NOT EXISTS shopify_content_performance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connection_id UUID NOT NULL REFERENCES platform_connections(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL, -- blog_post, landing_page, collection, product
  content_id TEXT NOT NULL,
  title TEXT,
  url TEXT,

  -- SEO Metrics
  organic_search_visits INTEGER DEFAULT 0,
  google_ranking_position INTEGER DEFAULT 0,
  backlinks_count INTEGER DEFAULT 0,
  domain_authority INTEGER DEFAULT 0,

  -- Engagement Metrics
  page_views INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  avg_time_on_page INTEGER DEFAULT 0,
  bounce_rate DECIMAL(5, 2) DEFAULT 0.00,
  exit_rate DECIMAL(5, 2) DEFAULT 0.00,

  -- Conversion Metrics
  conversions INTEGER DEFAULT 0,
  revenue DECIMAL(10, 2) DEFAULT 0.00,
  conversion_rate DECIMAL(5, 2) DEFAULT 0.00,

  -- Social Sharing
  shares_facebook INTEGER DEFAULT 0,
  shares_twitter INTEGER DEFAULT 0,
  shares_pinterest INTEGER DEFAULT 0,

  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(connection_id, content_type, content_id)
);

-- 4. Email & Marketing Performance
CREATE TABLE IF NOT EXISTS shopify_email_performance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connection_id UUID NOT NULL REFERENCES platform_connections(id) ON DELETE CASCADE,
  campaign_id TEXT NOT NULL,
  campaign_name TEXT,
  campaign_type TEXT, -- promotional, transactional, abandoned_cart, etc.
  send_date TIMESTAMP WITH TIME ZONE,

  -- Email Metrics
  emails_sent INTEGER DEFAULT 0,
  emails_delivered INTEGER DEFAULT 0,
  emails_opened INTEGER DEFAULT 0,
  emails_clicked INTEGER DEFAULT 0,
  unsubscribe_count INTEGER DEFAULT 0,

  -- Performance Rates
  delivery_rate DECIMAL(5, 2) DEFAULT 0.00,
  open_rate DECIMAL(5, 2) DEFAULT 0.00,
  click_rate DECIMAL(5, 2) DEFAULT 0.00,
  unsubscribe_rate DECIMAL(5, 2) DEFAULT 0.00,

  -- Revenue Attribution
  attributed_orders INTEGER DEFAULT 0,
  attributed_revenue DECIMAL(10, 2) DEFAULT 0.00,
  avg_order_value DECIMAL(10, 2) DEFAULT 0.00,

  -- Customer Segments
  target_segment TEXT,
  customer_count INTEGER DEFAULT 0,

  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(connection_id, campaign_id)
);

-- 5. Search & Discovery Analytics
CREATE TABLE IF NOT EXISTS shopify_search_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connection_id UUID NOT NULL REFERENCES platform_connections(id) ON DELETE CASCADE,
  search_term TEXT NOT NULL,
  search_date DATE NOT NULL,

  -- Search Performance
  searches INTEGER DEFAULT 0,
  results_count INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5, 2) DEFAULT 0.00,
  revenue DECIMAL(10, 2) DEFAULT 0.00,

  -- User Intent
  no_results BOOLEAN DEFAULT false,
  filter_used TEXT, -- price, brand, size, etc.
  sort_used TEXT, -- relevance, price_low, price_high, etc.

  -- Product Categories Searched
  category TEXT,
  subcategory TEXT,

  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(connection_id, search_term, search_date)
);

-- 6. Cart & Checkout Analytics
CREATE TABLE IF NOT EXISTS shopify_cart_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connection_id UUID NOT NULL REFERENCES platform_connections(id) ON DELETE CASCADE,
  cart_token TEXT NOT NULL,
  customer_id TEXT,

  -- Cart Contents
  items JSONB,
  item_count INTEGER DEFAULT 0,
  total_value DECIMAL(10, 2) DEFAULT 0.00,

  -- Cart Behavior
  created_at TIMESTAMP WITH TIME ZONE,
  last_updated TIMESTAMP WITH TIME ZONE,
  time_spent_in_cart INTEGER DEFAULT 0, -- seconds

  -- Conversion Data
  converted BOOLEAN DEFAULT false,
  conversion_timestamp TIMESTAMP WITH TIME ZONE,
  order_id TEXT,
  abandoned BOOLEAN DEFAULT false,

  -- Cart Modifications
  additions INTEGER DEFAULT 0,
  removals INTEGER DEFAULT 0,
  quantity_changes INTEGER DEFAULT 0,

  -- Customer Context
  device_type TEXT,
  utm_parameters JSONB,

  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(connection_id, cart_token)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_analytics_connection_id ON shopify_product_analytics(connection_id);
CREATE INDEX IF NOT EXISTS idx_product_analytics_conversion_rate ON shopify_product_analytics(conversion_rate);
CREATE INDEX IF NOT EXISTS idx_product_analytics_revenue ON shopify_product_analytics(revenue);

CREATE INDEX IF NOT EXISTS idx_customer_journey_connection_id ON shopify_customer_journey(connection_id);
CREATE INDEX IF NOT EXISTS idx_customer_journey_customer_id ON shopify_customer_journey(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_journey_conversion ON shopify_customer_journey(conversion_occurred);

CREATE INDEX IF NOT EXISTS idx_content_performance_connection_id ON shopify_content_performance(connection_id);
CREATE INDEX IF NOT EXISTS idx_content_performance_page_views ON shopify_content_performance(page_views);
CREATE INDEX IF NOT EXISTS idx_content_performance_conversion_rate ON shopify_content_performance(conversion_rate);

CREATE INDEX IF NOT EXISTS idx_email_performance_connection_id ON shopify_email_performance(connection_id);
CREATE INDEX IF NOT EXISTS idx_email_performance_open_rate ON shopify_email_performance(open_rate);
CREATE INDEX IF NOT EXISTS idx_email_performance_send_date ON shopify_email_performance(send_date);

CREATE INDEX IF NOT EXISTS idx_search_analytics_connection_id ON shopify_search_analytics(connection_id);
CREATE INDEX IF NOT EXISTS idx_search_analytics_search_term ON shopify_search_analytics(search_term);
CREATE INDEX IF NOT EXISTS idx_search_analytics_searches ON shopify_search_analytics(searches);

CREATE INDEX IF NOT EXISTS idx_cart_analytics_connection_id ON shopify_cart_analytics(connection_id);
CREATE INDEX IF NOT EXISTS idx_cart_analytics_abandoned ON shopify_cart_analytics(abandoned);
CREATE INDEX IF NOT EXISTS idx_cart_analytics_converted ON shopify_cart_analytics(converted);

-- Enable RLS
ALTER TABLE shopify_product_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_customer_journey ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_content_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_email_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_search_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_cart_analytics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own product analytics" ON shopify_product_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM platform_connections pc
      WHERE pc.id = shopify_product_analytics.connection_id
      AND pc.user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can view own customer journey" ON shopify_customer_journey
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM platform_connections pc
      WHERE pc.id = shopify_customer_journey.connection_id
      AND pc.user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can view own content performance" ON shopify_content_performance
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM platform_connections pc
      WHERE pc.id = shopify_content_performance.connection_id
      AND pc.user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can view own email performance" ON shopify_email_performance
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM platform_connections pc
      WHERE pc.id = shopify_email_performance.connection_id
      AND pc.user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can view own search analytics" ON shopify_search_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM platform_connections pc
      WHERE pc.id = shopify_search_analytics.connection_id
      AND pc.user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can view own cart analytics" ON shopify_cart_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM platform_connections pc
      WHERE pc.id = shopify_cart_analytics.connection_id
      AND pc.user_id = auth.uid()::text
    )
  );
