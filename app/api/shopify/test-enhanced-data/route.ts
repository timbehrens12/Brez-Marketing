import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { auth } from '@clerk/nextjs/server'

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

    // Get connection for this brand
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('id')
      .eq('platform_type', 'shopify')
      .eq('brand_id', brandId)
      .eq('user_id', userId)
      .single()

    if (connectionError || !connection) {
      return NextResponse.json({ error: 'No Shopify connection found for this brand' }, { status: 404 })
    }

    // Get brand_id and user_id from connection for existing table structure
    const { data: connectionDetails, error: detailsError } = await supabase
      .from('platform_connections')
      .select('brand_id, user_id')
      .eq('id', connection.id)
      .single()

    if (detailsError || !connectionDetails) {
      return NextResponse.json({ error: 'Failed to get connection details' }, { status: 500 })
    }

    // Insert sample data for existing table structure (using brand_id and user_id)
    const sampleProductAnalytics = [
      {
        brand_id: connectionDetails.brand_id,
        user_id: connectionDetails.user_id,
        product_id: 1001,
        date: new Date().toISOString().split('T')[0],
        views: 1250,
        units_sold: 23,
        revenue: 1150.00,
        returns: 2,
        conversion_rate: 1.84
      },
      {
        brand_id: connectionDetails.brand_id,
        user_id: connectionDetails.user_id,
        product_id: 1002,
        date: new Date().toISOString().split('T')[0],
        views: 2100,
        units_sold: 42,
        revenue: 2940.00,
        returns: 1,
        conversion_rate: 2.00
      }
    ]

    const sampleCustomerJourney = [
      {
        connection_id: connection.id,
        customer_id: 'cust_001',
        session_id: 'sess_001',
        first_touch_point: 'google_ads',
        first_touch_timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        last_touch_point: 'checkout',
        last_touch_timestamp: new Date().toISOString(),
        utm_source: 'google',
        utm_medium: 'cpc',
        utm_campaign: 'summer_sale',
        pages_viewed: JSON.stringify(['/products/premium-t-shirt', '/cart', '/checkout']),
        products_viewed: JSON.stringify(['1001']),
        cart_additions: JSON.stringify([{ product_id: '1001', quantity: 2 }]),
        time_spent_seconds: 1245,
        bounce_rate: false,
        device_type: 'mobile',
        browser: 'chrome',
        operating_system: 'ios',
        referrer: 'https://google.com',
        conversion_occurred: true,
        conversion_value: 100.00,
        conversion_timestamp: new Date().toISOString(),
        last_synced_at: new Date().toISOString()
      }
    ]

    const sampleSearchAnalytics = [
      {
        connection_id: connection.id,
        search_term: 't-shirt',
        search_date: new Date().toISOString().split('T')[0],
        searches: 145,
        results_count: 12,
        conversion_rate: 3.45,
        revenue: 2340.50,
        no_results: false,
        filter_used: 'price',
        sort_used: 'relevance',
        category: 'apparel',
        subcategory: 'shirts',
        last_synced_at: new Date().toISOString()
      },
      {
        connection_id: connection.id,
        search_term: 'hoodie',
        search_date: new Date().toISOString().split('T')[0],
        searches: 89,
        results_count: 8,
        conversion_rate: 4.49,
        revenue: 1890.00,
        no_results: false,
        filter_used: 'brand',
        sort_used: 'price_low',
        category: 'apparel',
        subcategory: 'hoodies',
        last_synced_at: new Date().toISOString()
      }
    ]

    // Insert sample data
    const results = await Promise.allSettled([
      supabase.from('shopify_product_analytics').upsert(sampleProductAnalytics, { 
        onConflict: 'brand_id,user_id,product_id,date',
        ignoreDuplicates: false 
      }),
      supabase.from('shopify_customer_journey').upsert(sampleCustomerJourney, { 
        onConflict: 'connection_id,customer_id,session_id',
        ignoreDuplicates: false 
      }),
      supabase.from('shopify_search_analytics').upsert(sampleSearchAnalytics, { 
        onConflict: 'connection_id,search_term,search_date',
        ignoreDuplicates: false 
      })
    ])

    const insertResults = results.map((result, index) => ({
      table: ['product_analytics', 'customer_journey', 'search_analytics'][index],
      status: result.status,
      error: result.status === 'rejected' ? result.reason : null
    }))

    return NextResponse.json({
      message: 'Test data inserted successfully - Note: Use the sync endpoint for real Shopify data',
      results: insertResults,
      timestamp: new Date().toISOString(),
      note: 'This endpoint inserts sample data. For real analytics, use /api/shopify/sync/enhanced-analytics'
    })

  } catch (error) {
    console.error('Test data insertion error:', error)
    return NextResponse.json({ error: 'Failed to insert test data' }, { status: 500 })
  }
}
