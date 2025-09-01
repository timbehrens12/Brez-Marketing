import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { auth } from '@clerk/nextjs/server'

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { brandId } = await request.json()

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    const supabase = createClient()

    console.log('🧪 Testing widgets with sample data for brand:', brandId)

    // Get connection for this brand
    const { data: connections, error: connectionsError } = await supabase
      .from('platform_connections')
      .select('id, user_id')
      .eq('brand_id', brandId)
      .eq('platform_type', 'shopify')
      .limit(1)

    if (connectionsError || !connections || connections.length === 0) {
      return NextResponse.json({ 
        error: 'No Shopify connections found for this brand' 
      }, { status: 404 })
    }

    const connection = connections[0]

    // 1. Create sample order data with San Francisco location
    const sampleOrder = {
      id: `test-sf-${Date.now()}`,
      connection_id: connection.id,
      brand_id: brandId,
      user_id: connection.user_id,
      order_number: Math.floor(Math.random() * 10000),
      total_price: 89.99,
      subtotal_price: 79.99,
      total_tax: 8.00,
      total_discounts: 0,
      created_at: new Date().toISOString(),
      financial_status: 'paid',
      fulfillment_status: 'fulfilled',
      customer_email: 'ayumu@sanfrancisco.com',
      currency: 'USD',
      customer_id: 'ayumu-sf-123',
      line_items: [{
        id: 'item-1',
        title: 'Premium T-Shirt',
        quantity: 1,
        price: 79.99
      }]
    }

    // Insert sample order
    await supabase
      .from('shopify_orders')
      .upsert(sampleOrder, { onConflict: 'id' })

            // 2. Create abandoned checkout data for testing cart abandonment features
        await supabase.from('shopify_abandoned_checkouts').insert({
          brand_id: brandId,
          connection_id: connection.id,
          customer_email: 'test-cart-abandoner@example.com',
          total_price: '89.99',
          line_items: [
            { title: 'Premium T-Shirt', quantity: 2, price: '39.99' },
            { title: 'Designer Jeans', quantity: 1, price: '49.99' }
          ],
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
          country: 'United States',
          province: 'California',
          city: 'San Francisco'
        })

        // Create another abandoned checkout with different location
        await supabase.from('shopify_abandoned_checkouts').insert({
          brand_id: brandId,
          connection_id: connection.id,
          customer_email: 'abandoned-cart@example.com',
          total_price: '156.50',
          line_items: [
            { title: 'Luxury Handbag', quantity: 1, price: '89.99' },
            { title: 'Designer Sunglasses', quantity: 1, price: '66.51' }
          ],
          created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
          country: 'Canada',
          province: 'Ontario',
          city: 'Toronto'
        })

        // 3. Create regional sales data
        await supabase
      .from('shopify_sales_by_region')
      .upsert({
        connection_id: connection.id.toString(),
        brand_id: brandId,
        user_id: connection.user_id?.toString(),
        order_id: sampleOrder.id,
        created_at: sampleOrder.created_at,
        city: 'San Francisco',
        province: 'California',
        province_code: 'CA',
        country: 'United States',
        country_code: 'US',
        total_price: sampleOrder.total_price,
        order_count: 1
      }, { onConflict: 'connection_id,order_id' })

    // 3. Create customer record
    await supabase
      .from('shopify_customers')
      .upsert({
        connection_id: connection.id,
        customer_id: 'ayumu-sf-123',
        email: 'ayumu@sanfrancisco.com',
        first_name: 'Ayumu',
        last_name: 'Customer',
        orders_count: 1,
        total_spent: 89.99,
        currency: 'USD',
        city: 'San Francisco',
        state_province: 'California',
        country: 'United States',
        geographic_region: 'United States',
        customer_segment: 'New',
        is_returning_customer: false,
        lifetime_value: 89.99,
        average_order_value: 89.99,
        purchase_frequency: 1,
        days_since_last_order: 0,
        created_at: new Date().toISOString(),
        last_synced_at: new Date().toISOString(),
        default_address: {
          city: 'San Francisco',
          province: 'California',
          country: 'United States'
        }
      }, { onConflict: 'connection_id,customer_id' })

    // 4. Create customer segment
    await supabase
      .from('shopify_customer_segments')
      .upsert({
        brand_id: brandId,
        user_id: connection.user_id?.toString(),
        connection_id: connection.id.toString(),
        segment_name: 'San Francisco, California, United States',
        segment_type: 'location',
        country: 'United States',
        province: 'California',
        city: 'San Francisco',
        customer_count: 1,
        total_orders: 1,
        total_revenue: 89.99,
        average_order_value: 89.99,
        clv_tier: 'low'
      }, { onConflict: 'brand_id,segment_name,segment_type' })

    // 5. Create sample inventory data
    const sampleInventory = [
      {
        connection_id: connection.id,
        product_id: 'prod-1',
        variant_id: 'var-1',
        product_title: 'Premium T-Shirt',
        variant_title: 'Size M',
        sku: 'TSHIRT-M',
        inventory_quantity: 25,
        price: 79.99,
        compare_at_price: 99.99,
        created_at: new Date().toISOString()
      },
      {
        connection_id: connection.id,
        product_id: 'prod-2',
        variant_id: 'var-2',
        product_title: 'Classic Hoodie',
        variant_title: 'Size L',
        sku: 'HOODIE-L',
        inventory_quantity: 0, // Out of stock
        price: 129.99,
        compare_at_price: 149.99,
        created_at: new Date().toISOString()
      },
      {
        connection_id: connection.id,
        product_id: 'prod-3',
        variant_id: 'var-3',
        product_title: 'Leather Wallet',
        variant_title: 'Brown',
        sku: 'WALLET-BR',
        inventory_quantity: 3, // Low stock
        price: 59.99,
        compare_at_price: 79.99,
        created_at: new Date().toISOString()
      },
      {
        connection_id: connection.id,
        product_id: 'prod-4',
        variant_id: 'var-4',
        product_title: 'Wireless Headphones',
        variant_title: 'Black',
        sku: 'HEADPHONES-BK',
        inventory_quantity: 15,
        price: 199.99,
        compare_at_price: 249.99,
        created_at: new Date().toISOString()
      }
    ]

    // Insert sample inventory
    for (const item of sampleInventory) {
      await supabase
        .from('shopify_inventory')
        .upsert(item, { onConflict: 'connection_id,variant_id' })
    }

    return NextResponse.json({
      success: true,
      message: 'Sample data created successfully',
      data: {
        ordersCreated: 1,
        customersCreated: 1,
        regionalSalesRecords: 1,
        customerSegments: 1,
        inventoryItems: sampleInventory.length
      }
    })

  } catch (error) {
    console.error('Test widgets error:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
