-- Shopify Discounts Table
-- Track discount codes and their performance for AI optimization

CREATE TABLE IF NOT EXISTS shopify_discounts_enhanced (
    id TEXT PRIMARY KEY,
    connection_id UUID NOT NULL REFERENCES platform_connections(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    amount NUMERIC,
    type TEXT, -- fixed_amount, percentage, shipping
    usage_count INTEGER DEFAULT 0,
    usage_limit INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    starts_at TIMESTAMP WITH TIME ZONE,
    ends_at TIMESTAMP WITH TIME ZONE,
    
    -- Calculated fields for AI insights
    is_active BOOLEAN GENERATED ALWAYS AS (
        CASE 
            WHEN starts_at IS NULL OR starts_at <= NOW() 
            AND (ends_at IS NULL OR ends_at >= NOW())
            THEN true
            ELSE false
        END
    ) STORED,
    
    usage_rate NUMERIC GENERATED ALWAYS AS (
        CASE 
            WHEN usage_limit IS NOT NULL AND usage_limit > 0 
            THEN (usage_count::numeric / usage_limit::numeric) * 100
            ELSE NULL
        END
    ) STORED,
    
    last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_shopify_discounts_enhanced_connection_id ON shopify_discounts_enhanced(connection_id);
CREATE INDEX IF NOT EXISTS idx_shopify_discounts_enhanced_code ON shopify_discounts_enhanced(code);
CREATE INDEX IF NOT EXISTS idx_shopify_discounts_enhanced_type ON shopify_discounts_enhanced(type);
CREATE INDEX IF NOT EXISTS idx_shopify_discounts_enhanced_is_active ON shopify_discounts_enhanced(is_active);
CREATE INDEX IF NOT EXISTS idx_shopify_discounts_enhanced_usage_count ON shopify_discounts_enhanced(usage_count);
CREATE INDEX IF NOT EXISTS idx_shopify_discounts_enhanced_starts_at ON shopify_discounts_enhanced(starts_at);
CREATE INDEX IF NOT EXISTS idx_shopify_discounts_enhanced_ends_at ON shopify_discounts_enhanced(ends_at);

-- RLS policies
ALTER TABLE shopify_discounts_enhanced ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view discounts from their connected brands" ON shopify_discounts_enhanced
    FOR SELECT USING (
        connection_id IN (
            SELECT pc.id FROM platform_connections pc
            JOIN brands b ON b.id = pc.brand_id
            WHERE b.created_by = auth.uid()
            OR EXISTS (
                SELECT 1 FROM brand_access ba 
                WHERE ba.brand_id = b.id 
                AND ba.user_id = auth.uid()
                AND ba.status = 'active'
            )
        )
    );

-- Comments
COMMENT ON TABLE shopify_discounts_enhanced IS 'Discount codes with performance metrics for AI optimization';
COMMENT ON COLUMN shopify_discounts_enhanced.is_active IS 'Whether discount is currently active based on dates';
COMMENT ON COLUMN shopify_discounts_enhanced.usage_rate IS 'Percentage of usage limit consumed';
