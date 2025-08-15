-- Shopify Draft Orders Table
-- Track cart abandonment and purchase intent for AI insights

CREATE TABLE IF NOT EXISTS shopify_draft_orders_enhanced (
    id TEXT PRIMARY KEY,
    connection_id UUID NOT NULL REFERENCES platform_connections(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    invoice_sent_at TIMESTAMP WITH TIME ZONE,
    invoice_url TEXT,
    line_items JSONB,
    total_price NUMERIC,
    customer_id TEXT,
    customer_email TEXT,
    status TEXT, -- open, invoice_sent, completed
    
    -- Calculated fields for AI insights
    days_since_created INTEGER GENERATED ALWAYS AS (
        EXTRACT(DAY FROM NOW() - created_at)::integer
    ) STORED,
    
    is_abandoned BOOLEAN GENERATED ALWAYS AS (
        CASE 
            WHEN status != 'completed' 
            AND created_at < NOW() - INTERVAL '1 day'
            THEN true
            ELSE false
        END
    ) STORED,
    
    item_count INTEGER GENERATED ALWAYS AS (
        CASE 
            WHEN line_items IS NOT NULL 
            THEN jsonb_array_length(line_items)
            ELSE 0
        END
    ) STORED,
    
    has_high_value BOOLEAN GENERATED ALWAYS AS (
        CASE 
            WHEN total_price > 100 
            THEN true
            ELSE false
        END
    ) STORED,
    
    last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_shopify_draft_orders_enhanced_connection_id ON shopify_draft_orders_enhanced(connection_id);
CREATE INDEX IF NOT EXISTS idx_shopify_draft_orders_enhanced_customer_id ON shopify_draft_orders_enhanced(customer_id);
CREATE INDEX IF NOT EXISTS idx_shopify_draft_orders_enhanced_customer_email ON shopify_draft_orders_enhanced(customer_email);
CREATE INDEX IF NOT EXISTS idx_shopify_draft_orders_enhanced_status ON shopify_draft_orders_enhanced(status);
CREATE INDEX IF NOT EXISTS idx_shopify_draft_orders_enhanced_created_at ON shopify_draft_orders_enhanced(created_at);
CREATE INDEX IF NOT EXISTS idx_shopify_draft_orders_enhanced_is_abandoned ON shopify_draft_orders_enhanced(is_abandoned);
CREATE INDEX IF NOT EXISTS idx_shopify_draft_orders_enhanced_total_price ON shopify_draft_orders_enhanced(total_price);
CREATE INDEX IF NOT EXISTS idx_shopify_draft_orders_enhanced_has_high_value ON shopify_draft_orders_enhanced(has_high_value);

-- RLS policies
ALTER TABLE shopify_draft_orders_enhanced ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view draft orders from their connected brands" ON shopify_draft_orders_enhanced
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
COMMENT ON TABLE shopify_draft_orders_enhanced IS 'Draft orders for cart abandonment analysis and retargeting';
COMMENT ON COLUMN shopify_draft_orders_enhanced.days_since_created IS 'Days since draft order was created';
COMMENT ON COLUMN shopify_draft_orders_enhanced.is_abandoned IS 'Whether draft order is considered abandoned (1+ days old, not completed)';
COMMENT ON COLUMN shopify_draft_orders_enhanced.item_count IS 'Number of items in the draft order';
COMMENT ON COLUMN shopify_draft_orders_enhanced.has_high_value IS 'Whether order value is above $100 threshold';
