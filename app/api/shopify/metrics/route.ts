import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

interface ShopifyMetrics {
  totalSales: number
  ordersCount: number
  averageOrderValue: number
  conversionRate: number
  customerCount: number
}

async function fetchShopifyData(storeUrl: string, accessToken: string): Promise<ShopifyMetrics> {
  // Make API calls to Shopify
  const response = await fetch(`https://${storeUrl}/admin/api/2024-01/orders/count.json`, {
    headers: {
      'X-Shopify-Access-Token': accessToken
    }
  })

  if (!response.ok) {
    throw new Error('Failed to fetch Shopify data')
  }

  const data = await response.json()
  
  // Calculate metrics
  return {
    totalSales: 0, // Replace with actual calculations
    ordersCount: data.count,
    averageOrderValue: 0,
    conversionRate: 0,
    customerCount: 0
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const brandId = searchParams.get('brandId')

  if (!brandId) {
    return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
  }

  try {
    // Get the Shopify connection for this brand
    const { data: connection, error: connError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('brand_id', brandId)
      .eq('platform_type', 'shopify')
      .single()

    if (connError || !connection) {
      throw new Error('No Shopify connection found')
    }

    const shopifyData = await fetchShopifyData(connection.store_url, connection.access_token)

    // Update metrics in database
    const { error: metricsError } = await supabase
      .from('metrics')
      .upsert({
        brand_id: brandId,
        platform_type: 'shopify',
        total_sales: shopifyData.totalSales,
        orders_count: shopifyData.ordersCount,
        average_order_value: shopifyData.averageOrderValue,
        conversion_rate: shopifyData.conversionRate,
        customer_count: shopifyData.customerCount
      })

    if (metricsError) throw metricsError

    return NextResponse.json(shopifyData)
  } catch (error) {
    console.error('Error fetching Shopify metrics:', error)
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 })
  }
} 