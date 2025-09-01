-- =====================================================
-- UPSERT FUNCTIONS FOR PROMOTING STAGING TO PRODUCTION
-- =====================================================

-- Function to promote orders from staging to production
CREATE OR REPLACE FUNCTION promote_orders_to_production(brand_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
    rows_affected INTEGER;
BEGIN
    -- Upsert orders from stage to app
    INSERT INTO app.shopify_orders 
    (order_id, brand_id, connection_id, name, order_number, email, created_at, updated_at, processed_at,
     currency, total_price, subtotal_price, total_tax, total_discounts, financial_status, fulfillment_status,
     customer_id, customer_email, customer_first_name, customer_last_name, tags, note,
     shipping_city, shipping_province, shipping_country, shipping_country_code, synced_at)
    SELECT 
        order_id, brand_id, connection_id, name, order_number, email, created_at, updated_at, processed_at,
        currency, total_price, subtotal_price, total_tax, total_discounts, financial_status, fulfillment_status,
        customer_id, customer_email, customer_first_name, customer_last_name, tags, note,
        shipping_city, shipping_province, shipping_country, shipping_country_code, synced_at
    FROM stage.shopify_orders
    WHERE brand_id = brand_id_param
    ON CONFLICT (order_id) DO UPDATE SET
        name = EXCLUDED.name,
        order_number = EXCLUDED.order_number,
        email = EXCLUDED.email,
        created_at = EXCLUDED.created_at,
        updated_at = EXCLUDED.updated_at,
        processed_at = EXCLUDED.processed_at,
        currency = EXCLUDED.currency,
        total_price = EXCLUDED.total_price,
        subtotal_price = EXCLUDED.subtotal_price,
        total_tax = EXCLUDED.total_tax,
        total_discounts = EXCLUDED.total_discounts,
        financial_status = EXCLUDED.financial_status,
        fulfillment_status = EXCLUDED.fulfillment_status,
        customer_id = EXCLUDED.customer_id,
        customer_email = EXCLUDED.customer_email,
        customer_first_name = EXCLUDED.customer_first_name,
        customer_last_name = EXCLUDED.customer_last_name,
        tags = EXCLUDED.tags,
        note = EXCLUDED.note,
        shipping_city = EXCLUDED.shipping_city,
        shipping_province = EXCLUDED.shipping_province,
        shipping_country = EXCLUDED.shipping_country,
        shipping_country_code = EXCLUDED.shipping_country_code,
        synced_at = EXCLUDED.synced_at;

    GET DIAGNOSTICS rows_affected = ROW_COUNT;
    
    -- Clear staging table for this brand
    DELETE FROM stage.shopify_orders WHERE brand_id = brand_id_param;
    
    RETURN rows_affected;
END;
$$ LANGUAGE plpgsql;

-- Function to promote line items from staging to production
CREATE OR REPLACE FUNCTION promote_line_items_to_production(brand_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
    rows_affected INTEGER;
BEGIN
    -- Upsert line items from stage to app
    INSERT INTO app.shopify_line_items
    (order_id, line_item_id, brand_id, connection_id, name, title, quantity, price, total_discount,
     sku, product_id, variant_id, variant_title, vendor, grams, requires_shipping, taxable,
     gift_card, fulfillment_service, fulfillment_status, synced_at)
    SELECT 
        order_id, line_item_id, brand_id, connection_id, name, title, quantity, price, total_discount,
        sku, product_id, variant_id, variant_title, vendor, grams, requires_shipping, taxable,
        gift_card, fulfillment_service, fulfillment_status, synced_at
    FROM stage.shopify_line_items
    WHERE brand_id = brand_id_param
    ON CONFLICT (order_id, line_item_id) DO UPDATE SET
        name = EXCLUDED.name,
        title = EXCLUDED.title,
        quantity = EXCLUDED.quantity,
        price = EXCLUDED.price,
        total_discount = EXCLUDED.total_discount,
        sku = EXCLUDED.sku,
        product_id = EXCLUDED.product_id,
        variant_id = EXCLUDED.variant_id,
        variant_title = EXCLUDED.variant_title,
        vendor = EXCLUDED.vendor,
        grams = EXCLUDED.grams,
        requires_shipping = EXCLUDED.requires_shipping,
        taxable = EXCLUDED.taxable,
        gift_card = EXCLUDED.gift_card,
        fulfillment_service = EXCLUDED.fulfillment_service,
        fulfillment_status = EXCLUDED.fulfillment_status,
        synced_at = EXCLUDED.synced_at;

    GET DIAGNOSTICS rows_affected = ROW_COUNT;
    
    -- Clear staging table for this brand
    DELETE FROM stage.shopify_line_items WHERE brand_id = brand_id_param;
    
    RETURN rows_affected;
END;
$$ LANGUAGE plpgsql;

-- Function to promote customers from staging to production
CREATE OR REPLACE FUNCTION promote_customers_to_production(brand_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
    rows_affected INTEGER;
BEGIN
    -- Upsert customers from stage to app
    INSERT INTO app.shopify_customers
    (customer_id, brand_id, connection_id, email, first_name, last_name, phone, accepts_marketing,
     created_at, updated_at, orders_count, total_spent, last_order_id, last_order_name, currency,
     marketing_opt_in_level, email_marketing_consent, sms_marketing_consent, tags, note,
     tax_exempt, verified_email, multipass_identifier, addresses, default_address, synced_at)
    SELECT 
        customer_id, brand_id, connection_id, email, first_name, last_name, phone, accepts_marketing,
        created_at, updated_at, orders_count, total_spent, last_order_id, last_order_name, currency,
        marketing_opt_in_level, email_marketing_consent, sms_marketing_consent, tags, note,
        tax_exempt, verified_email, multipass_identifier, addresses, default_address, synced_at
    FROM stage.shopify_customers
    WHERE brand_id = brand_id_param
    ON CONFLICT (customer_id) DO UPDATE SET
        email = EXCLUDED.email,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        phone = EXCLUDED.phone,
        accepts_marketing = EXCLUDED.accepts_marketing,
        created_at = EXCLUDED.created_at,
        updated_at = EXCLUDED.updated_at,
        orders_count = EXCLUDED.orders_count,
        total_spent = EXCLUDED.total_spent,
        last_order_id = EXCLUDED.last_order_id,
        last_order_name = EXCLUDED.last_order_name,
        currency = EXCLUDED.currency,
        marketing_opt_in_level = EXCLUDED.marketing_opt_in_level,
        email_marketing_consent = EXCLUDED.email_marketing_consent,
        sms_marketing_consent = EXCLUDED.sms_marketing_consent,
        tags = EXCLUDED.tags,
        note = EXCLUDED.note,
        tax_exempt = EXCLUDED.tax_exempt,
        verified_email = EXCLUDED.verified_email,
        multipass_identifier = EXCLUDED.multipass_identifier,
        addresses = EXCLUDED.addresses,
        default_address = EXCLUDED.default_address,
        synced_at = EXCLUDED.synced_at;

    GET DIAGNOSTICS rows_affected = ROW_COUNT;
    
    -- Clear staging table for this brand
    DELETE FROM stage.shopify_customers WHERE brand_id = brand_id_param;
    
    RETURN rows_affected;
END;
$$ LANGUAGE plpgsql;

-- Function to promote products from staging to production
CREATE OR REPLACE FUNCTION promote_products_to_production(brand_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
    rows_affected INTEGER;
BEGIN
    -- Upsert products from stage to app
    INSERT INTO app.shopify_products
    (product_id, brand_id, connection_id, title, body_html, vendor, product_type, handle,
     status, published_scope, tags, options, variants, images, created_at, updated_at,
     published_at, synced_at)
    SELECT 
        product_id, brand_id, connection_id, title, body_html, vendor, product_type, handle,
        status, published_scope, tags, options, variants, images, created_at, updated_at,
        published_at, synced_at
    FROM stage.shopify_products
    WHERE brand_id = brand_id_param
    ON CONFLICT (product_id) DO UPDATE SET
        title = EXCLUDED.title,
        body_html = EXCLUDED.body_html,
        vendor = EXCLUDED.vendor,
        product_type = EXCLUDED.product_type,
        handle = EXCLUDED.handle,
        status = EXCLUDED.status,
        published_scope = EXCLUDED.published_scope,
        tags = EXCLUDED.tags,
        options = EXCLUDED.options,
        variants = EXCLUDED.variants,
        images = EXCLUDED.images,
        created_at = EXCLUDED.created_at,
        updated_at = EXCLUDED.updated_at,
        published_at = EXCLUDED.published_at,
        synced_at = EXCLUDED.synced_at;

    GET DIAGNOSTICS rows_affected = ROW_COUNT;
    
    -- Clear staging table for this brand
    DELETE FROM stage.shopify_products WHERE brand_id = brand_id_param;
    
    RETURN rows_affected;
END;
$$ LANGUAGE plpgsql;
