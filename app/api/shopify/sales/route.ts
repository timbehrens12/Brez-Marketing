import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const brandId = searchParams.get('brandId')
  
  if (!brandId) {
    return NextResponse.json({ error: 'Missing brandId' }, { status: 400 })
  }

  try {
    // Get the Shopify connection
    const { data: connection } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('brand_id', brandId)
      .eq('platform_type', 'shopify')
      .single()

    if (!connection) {
      return NextResponse.json({ error: 'No Shopify connection found' }, { status: 404 })
    }

    // Fetch orders from Shopify
    const ordersResponse = await fetch(
      `https://${connection.store_url}/admin/api/2024-01/orders.json?status=any&limit=250`,
      {
        headers: {
          'X-Shopify-Access-Token': connection.access_token,
        },
      }
    )

    const ordersData = await ordersResponse.json()

    // Fetch products
    const productsResponse = await fetch(
      `https://${connection.store_url}/admin/api/2024-01/products.json`,
      {
        headers: {
          'X-Shopify-Access-Token': connection.access_token,
        },
      }
    )

    const productsData = await productsResponse.json()

    return NextResponse.json({
      orders: ordersData.orders,
      products: productsData.products
    })
  } catch (error) {
    console.error('Error fetching Shopify data:', error)
    return NextResponse.json({ error: 'Failed to fetch Shopify data' }, { status: 500 })
  }
} 