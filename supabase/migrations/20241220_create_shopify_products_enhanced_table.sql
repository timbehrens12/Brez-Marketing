-- Enhanced Shopify Products Table
-- Store comprehensive product data for AI analysis

CREATE TABLE IF NOT EXISTS shopify_products_enhanced (
    id TEXT PRIMARY KEY,
    connection_id UUID NOT NULL REFERENCES platform_connections(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    vendor TEXT,
    product_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    published_at TIMESTAMP WITH TIME ZONE,
    status TEXT, -- active, draft, archived
    tags TEXT,
    variants JSONB, -- Array of product variants with pricing/inventory
    images JSONB, -- Array of product images
    options JSONB, -- Product options like size, color
    
    -- Calculated fields for AI insights
    min_price NUMERIC GENERATED ALWAYS AS (
        CASE 
            WHEN variants IS NOT NULL AND jsonb_array_length(variants) > 0 
            THEN (
                SELECT MIN((variant->>'price')::numeric)
                FROM jsonb_array_elements(variants) AS variant
            )
            ELSE NULL
        END
    ) STORED,
    
    max_price NUMERIC GENERATED ALWAYS AS (
        CASE 
            WHEN variants IS NOT NULL AND jsonb_array_length(variants) > 0 
            THEN (
                SELECT MAX((variant->>'price')::numeric)
                FROM jsonb_array_elements(variants) AS variant
            )
            ELSE NULL
        END
    ) STORED,
    
    total_inventory INTEGER GENERATED ALWAYS AS (
        CASE 
            WHEN variants IS NOT NULL AND jsonb_array_length(variants) > 0 
            THEN (
                SELECT SUM((variant->>'inventory_quantity')::integer)
                FROM jsonb_array_elements(variants) AS variant
                WHERE variant->>'inventory_quantity' IS NOT NULL
            )
            ELSE NULL
        END
    ) STORED,
    
    variant_count INTEGER GENERATED ALWAYS AS (
        CASE 
            WHEN variants IS NOT NULL 
            THEN jsonb_array_length(variants)
            ELSE 0
        END
    ) STORED,
    
    last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_shopify_products_enhanced_connection_id ON shopify_products_enhanced(connection_id);
CREATE INDEX IF NOT EXISTS idx_shopify_products_enhanced_product_type ON shopify_products_enhanced(product_type);
CREATE INDEX IF NOT EXISTS idx_shopify_products_enhanced_vendor ON shopify_products_enhanced(vendor);
CREATE INDEX IF NOT EXISTS idx_shopify_products_enhanced_status ON shopify_products_enhanced(status);
CREATE INDEX IF NOT EXISTS idx_shopify_products_enhanced_created_at ON shopify_products_enhanced(created_at);
CREATE INDEX IF NOT EXISTS idx_shopify_products_enhanced_min_price ON shopify_products_enhanced(min_price);
CREATE INDEX IF NOT EXISTS idx_shopify_products_enhanced_total_inventory ON shopify_products_enhanced(total_inventory);
CREATE INDEX IF NOT EXISTS idx_shopify_products_enhanced_tags ON shopify_products_enhanced USING gin(to_tsvector('english', tags));

-- RLS policies
ALTER TABLE shopify_products_enhanced ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view products from their connected brands" ON shopify_products_enhanced
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
COMMENT ON TABLE shopify_products_enhanced IS 'Enhanced product data with calculated fields for AI analysis';
COMMENT ON COLUMN shopify_products_enhanced.min_price IS 'Lowest price among all variants';
COMMENT ON COLUMN shopify_products_enhanced.max_price IS 'Highest price among all variants';
COMMENT ON COLUMN shopify_products_enhanced.total_inventory IS 'Sum of inventory across all variants';
COMMENT ON COLUMN shopify_products_enhanced.variant_count IS 'Number of product variants';
