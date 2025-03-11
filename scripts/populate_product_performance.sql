-- This script populates the product performance tables with sample data
-- It assumes you have already created the tables using create_product_performance_tables.sql
-- and that you have at least one Shopify connection in the platform_connections table

-- Get the first Shopify connection ID and brand ID
DO $$
DECLARE
    connection_id UUID;
    brand_id UUID;
    product_ids TEXT[] := ARRAY['123456789', '234567890', '345678901', '456789012', '567890123'];
    product_names TEXT[] := ARRAY['Premium T-Shirt', 'Classic Hoodie', 'Slim Fit Jeans', 'Wireless Earbuds', 'Leather Wallet'];
    product_skus TEXT[] := ARRAY['TS-001', 'HD-002', 'JN-003', 'WE-004', 'LW-005'];
BEGIN
    -- Get the first connection ID and brand ID
    SELECT pc.id, pc.brand_id INTO connection_id, brand_id
    FROM platform_connections pc
    WHERE pc.platform_type = 'shopify'
    LIMIT 1;
    
    IF connection_id IS NULL THEN
        RAISE NOTICE 'No Shopify connection found. Please connect a Shopify store first.';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Using connection_id: % and brand_id: %', connection_id, brand_id;
    
    -- Clear existing data for this connection
    DELETE FROM product_performance_metrics WHERE connection_id = connection_id;
    DELETE FROM product_relationships WHERE connection_id = connection_id;
    DELETE FROM product_reviews WHERE connection_id = connection_id;
    DELETE FROM product_views WHERE connection_id = connection_id;
    DELETE FROM product_returns WHERE connection_id = connection_id;
    DELETE FROM inventory_turnover WHERE connection_id = connection_id;
    
    -- Insert product performance metrics
    FOR i IN 1..5 LOOP
        INSERT INTO product_performance_metrics (
            product_id,
            connection_id,
            brand_id,
            product_name,
            sku,
            views_count,
            purchases_count,
            view_to_purchase_ratio,
            return_rate,
            average_rating,
            review_count,
            inventory_turnover_rate,
            revenue_generated,
            profit_margin,
            last_updated
        ) VALUES (
            product_ids[i],
            connection_id,
            brand_id,
            product_names[i],
            product_skus[i],
            FLOOR(RANDOM() * 2000 + 500)::INTEGER, -- views between 500-2500
            FLOOR(RANDOM() * 400 + 100)::INTEGER, -- purchases between 100-500
            FLOOR(RANDOM() * 30 + 10)::DECIMAL(10, 2), -- view-to-purchase ratio between 10-40%
            FLOOR(RANDOM() * 10 + 1)::DECIMAL(5, 2), -- return rate between 1-11%
            (RANDOM() * 2 + 3)::DECIMAL(3, 2), -- average rating between 3-5
            FLOOR(RANDOM() * 100 + 10)::INTEGER, -- review count between 10-110
            (RANDOM() * 4 + 1)::DECIMAL(10, 2), -- inventory turnover rate between 1-5
            FLOOR(RANDOM() * 30000 + 5000)::DECIMAL(12, 2), -- revenue between 5000-35000
            FLOOR(RANDOM() * 40 + 20)::DECIMAL(5, 2), -- profit margin between 20-60%
            NOW() - (RANDOM() * INTERVAL '30 days') -- last updated within the last 30 days
        );
    END LOOP;
    
    -- Insert product relationships
    -- Premium T-Shirt + Classic Hoodie
    INSERT INTO product_relationships (
        product_id,
        related_product_id,
        connection_id,
        brand_id,
        relationship_type,
        strength,
        conversion_rate,
        last_updated
    ) VALUES (
        product_ids[1], -- Premium T-Shirt
        product_ids[2], -- Classic Hoodie
        connection_id,
        brand_id,
        'frequently_bought_together',
        85, -- strength
        32.5, -- conversion rate
        NOW() - (RANDOM() * INTERVAL '10 days')
    );
    
    -- Wireless Earbuds + Leather Wallet (cross-sell)
    INSERT INTO product_relationships (
        product_id,
        related_product_id,
        connection_id,
        brand_id,
        relationship_type,
        strength,
        conversion_rate,
        last_updated
    ) VALUES (
        product_ids[4], -- Wireless Earbuds
        product_ids[5], -- Leather Wallet
        connection_id,
        brand_id,
        'cross-sell',
        72, -- strength
        28.4, -- conversion rate
        NOW() - (RANDOM() * INTERVAL '10 days')
    );
    
    -- Slim Fit Jeans + Leather Wallet (frequently bought together)
    INSERT INTO product_relationships (
        product_id,
        related_product_id,
        connection_id,
        brand_id,
        relationship_type,
        strength,
        conversion_rate,
        last_updated
    ) VALUES (
        product_ids[3], -- Slim Fit Jeans
        product_ids[5], -- Leather Wallet
        connection_id,
        brand_id,
        'frequently_bought_together',
        68, -- strength
        24.2, -- conversion rate
        NOW() - (RANDOM() * INTERVAL '10 days')
    );
    
    -- Classic Hoodie → Premium T-Shirt (upsell)
    INSERT INTO product_relationships (
        product_id,
        related_product_id,
        connection_id,
        brand_id,
        relationship_type,
        strength,
        conversion_rate,
        last_updated
    ) VALUES (
        product_ids[2], -- Classic Hoodie
        product_ids[1], -- Premium T-Shirt
        connection_id,
        brand_id,
        'upsell',
        62, -- strength
        18.5, -- conversion rate
        NOW() - (RANDOM() * INTERVAL '10 days')
    );
    
    -- Leather Wallet + Wireless Earbuds (cross-sell)
    INSERT INTO product_relationships (
        product_id,
        related_product_id,
        connection_id,
        brand_id,
        relationship_type,
        strength,
        conversion_rate,
        last_updated
    ) VALUES (
        product_ids[5], -- Leather Wallet
        product_ids[4], -- Wireless Earbuds
        connection_id,
        brand_id,
        'cross-sell',
        58, -- strength
        15.8, -- conversion rate
        NOW() - (RANDOM() * INTERVAL '10 days')
    );
    
    -- Insert product reviews
    -- Premium T-Shirt review
    INSERT INTO product_reviews (
        product_id,
        connection_id,
        brand_id,
        customer_id,
        order_id,
        rating,
        review_title,
        review_text,
        sentiment_score,
        verified_purchase,
        helpful_votes,
        published,
        reviewed_at
    ) VALUES (
        product_ids[1], -- Premium T-Shirt
        connection_id,
        brand_id,
        'customer123',
        'order456',
        5, -- rating
        'Great quality!',
        'The fabric is amazing and it fits perfectly.',
        0.9, -- sentiment score
        TRUE, -- verified purchase
        12, -- helpful votes
        TRUE, -- published
        NOW() - INTERVAL '15 days'
    );
    
    -- Wireless Earbuds review
    INSERT INTO product_reviews (
        product_id,
        connection_id,
        brand_id,
        customer_id,
        order_id,
        rating,
        review_title,
        review_text,
        sentiment_score,
        verified_purchase,
        helpful_votes,
        published,
        reviewed_at
    ) VALUES (
        product_ids[4], -- Wireless Earbuds
        connection_id,
        brand_id,
        'customer456',
        'order789',
        4, -- rating
        'Good sound quality',
        'Battery life could be better, but sound is excellent.',
        0.7, -- sentiment score
        TRUE, -- verified purchase
        8, -- helpful votes
        TRUE, -- published
        NOW() - INTERVAL '28 days'
    );
    
    -- Leather Wallet review
    INSERT INTO product_reviews (
        product_id,
        connection_id,
        brand_id,
        customer_id,
        order_id,
        rating,
        review_title,
        review_text,
        sentiment_score,
        verified_purchase,
        helpful_votes,
        published,
        reviewed_at
    ) VALUES (
        product_ids[5], -- Leather Wallet
        connection_id,
        brand_id,
        'customer789',
        'order012',
        5, -- rating
        'Excellent craftsmanship',
        'This wallet is beautiful and well-made. Highly recommend!',
        0.95, -- sentiment score
        TRUE, -- verified purchase
        15, -- helpful votes
        TRUE, -- published
        NOW() - INTERVAL '22 days'
    );
    
    -- Slim Fit Jeans review
    INSERT INTO product_reviews (
        product_id,
        connection_id,
        brand_id,
        customer_id,
        order_id,
        rating,
        review_title,
        review_text,
        sentiment_score,
        verified_purchase,
        helpful_votes,
        published,
        reviewed_at
    ) VALUES (
        product_ids[3], -- Slim Fit Jeans
        connection_id,
        brand_id,
        'customer012',
        'order345',
        3, -- rating
        'Sizing issues',
        'Quality is good but runs small. Order a size up.',
        0.2, -- sentiment score
        TRUE, -- verified purchase
        20, -- helpful votes
        TRUE, -- published
        NOW() - INTERVAL '10 days'
    );
    
    -- Classic Hoodie review
    INSERT INTO product_reviews (
        product_id,
        connection_id,
        brand_id,
        customer_id,
        order_id,
        rating,
        review_title,
        review_text,
        sentiment_score,
        verified_purchase,
        helpful_votes,
        published,
        reviewed_at
    ) VALUES (
        product_ids[2], -- Classic Hoodie
        connection_id,
        brand_id,
        'customer345',
        'order678',
        5, -- rating
        'So comfortable!',
        'This is my new favorite hoodie. Super soft and warm.',
        0.9, -- sentiment score
        TRUE, -- verified purchase
        7, -- helpful votes
        TRUE, -- published
        NOW() - INTERVAL '5 days'
    );
    
    -- Insert product views
    FOR i IN 1..5 LOOP
        FOR j IN 1..10 LOOP
            INSERT INTO product_views (
                product_id,
                connection_id,
                brand_id,
                customer_id,
                session_id,
                viewed_at,
                source,
                device_type,
                time_spent_seconds
            ) VALUES (
                product_ids[i],
                connection_id,
                brand_id,
                'customer' || (FLOOR(RANDOM() * 1000))::TEXT,
                'session' || (FLOOR(RANDOM() * 5000))::TEXT,
                NOW() - (RANDOM() * INTERVAL '30 days'),
                (ARRAY['search', 'category', 'recommendation', 'direct', 'social'])[FLOOR(RANDOM() * 5 + 1)],
                (ARRAY['mobile', 'desktop', 'tablet'])[FLOOR(RANDOM() * 3 + 1)],
                FLOOR(RANDOM() * 300 + 10)::INTEGER -- time spent between 10-310 seconds
            );
        END LOOP;
    END LOOP;
    
    -- Insert product returns
    FOR i IN 1..5 LOOP
        -- Only add returns for some products to make the data more realistic
        IF RANDOM() < 0.7 THEN
            INSERT INTO product_returns (
                order_id,
                product_id,
                variant_id,
                connection_id,
                brand_id,
                customer_id,
                quantity,
                return_reason,
                return_status,
                returned_at,
                refunded_amount
            ) VALUES (
                'order' || (FLOOR(RANDOM() * 1000))::TEXT,
                product_ids[i],
                'variant' || (FLOOR(RANDOM() * 10))::TEXT,
                connection_id,
                brand_id,
                'customer' || (FLOOR(RANDOM() * 1000))::TEXT,
                FLOOR(RANDOM() * 3 + 1)::INTEGER, -- quantity between 1-3
                (ARRAY['wrong size', 'damaged', 'not as described', 'changed mind', 'arrived late'])[FLOOR(RANDOM() * 5 + 1)],
                (ARRAY['requested', 'approved', 'received', 'refunded'])[FLOOR(RANDOM() * 4 + 1)],
                NOW() - (RANDOM() * INTERVAL '30 days'),
                FLOOR(RANDOM() * 200 + 20)::DECIMAL(10, 2) -- refund amount between 20-220
            );
        END IF;
    END LOOP;
    
    -- Insert inventory turnover data
    FOR i IN 1..5 LOOP
        INSERT INTO inventory_turnover (
            product_id,
            variant_id,
            connection_id,
            brand_id,
            period_start,
            period_end,
            beginning_inventory,
            ending_inventory,
            units_sold,
            turnover_rate,
            days_to_sell_through,
            restock_recommendation
        ) VALUES (
            product_ids[i],
            'variant' || (FLOOR(RANDOM() * 10))::TEXT,
            connection_id,
            brand_id,
            NOW() - INTERVAL '30 days',
            NOW(),
            FLOOR(RANDOM() * 500 + 100)::INTEGER, -- beginning inventory between 100-600
            FLOOR(RANDOM() * 100 + 10)::INTEGER, -- ending inventory between 10-110
            FLOOR(RANDOM() * 400 + 50)::INTEGER, -- units sold between 50-450
            (RANDOM() * 4 + 1)::DECIMAL(10, 2), -- turnover rate between 1-5
            FLOOR(RANDOM() * 60 + 10)::INTEGER, -- days to sell through between 10-70
            RANDOM() > 0.7 -- restock recommendation for some products
        );
    END LOOP;
    
    RAISE NOTICE 'Sample data has been successfully inserted into product performance tables.';
END $$; 