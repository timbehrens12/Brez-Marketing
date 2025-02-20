import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'
import Shopify from 'shopify-api-node'  // You'll need to install this package

interface ShopifyConnection {
  store_url: string;
  access_token: string;
}

async function fetchShopifyData(conn: ShopifyConnection) {
  const shopify = new Shopify({
    shopName: conn.store_url,
    accessToken: conn.access_token,
    apiVersion: '2024-01'  // Use latest version
  });

  try {
    const [orders, products] = await Promise.all([
      shopify.order.list({ status: 'any' }),
      shopify.product.list()
    ]);

    const totalSales = orders.reduce((sum, order) => 
      sum + (Number(order.total_price) || 0), 0);

    return {
      orders,
      products,
      totalSales,
      customerSegments: {
        newCustomers: 0,  // You'll need to implement this logic
        returningCustomers: 0
      }
    };
  } catch (error) {
    console.error('Shopify API Error:', error);
    return {
      orders: [],
      products: [],
      totalSales: 0,
      customerSegments: { newCustomers: 0, returningCustomers: 0 }
    };
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const brandId = searchParams.get('brandId')

  if (!brandId) {
    return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
  }

  try {
    // Get all Shopify connections for this brand
    const { data: connections, error: connError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('brand_id', brandId)
      .eq('platform_type', 'shopify')

    if (connError) throw connError

    // Fetch data from all connected Shopify stores
    const allStoreData = await Promise.all(
      connections.map(async (conn) => {
        // Your existing Shopify API call logic here
        // Use conn.access_token and conn.store_url
        return fetchShopifyData(conn)
      })
    )

    // Aggregate data from all stores
    const aggregatedData = {
      orders: allStoreData.flatMap(data => data.orders),
      products: allStoreData.flatMap(data => data.products),
      totalSales: allStoreData.reduce((sum, data) => sum + data.totalSales, 0),
      customerSegments: {
        newCustomers: allStoreData.reduce((sum, data) => sum + data.customerSegments.newCustomers, 0),
        returningCustomers: allStoreData.reduce((sum, data) => sum + data.customerSegments.returningCustomers, 0)
      }
    }

    return NextResponse.json(aggregatedData)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
  }
} 