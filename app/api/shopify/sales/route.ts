import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const brandId = searchParams.get('brandId')
  
  if (!brandId) {
    return NextResponse.json({ error: 'Missing brandId' }, { status: 400 })
  }

  try {
    const { data: connection } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('brand_id', brandId)
      .eq('platform_type', 'shopify')
      .single()

    if (!connection) {
      return NextResponse.json({ 
        orders: [], 
        products: [], 
        refunds: [] 
      })
    }

    // Get orders
    const ordersResponse = await fetch(
      `https://${connection.store_url}/admin/api/2024-01/orders.json?status=any`,
      {
        headers: {
          'X-Shopify-Access-Token': connection.access_token,
        },
      }
    )

    const ordersData = await ordersResponse.json()

    return NextResponse.json({
      orders: ordersData.orders || [],
      products: [],
      refunds: []
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ 
      orders: [], 
      products: [], 
      refunds: [] 
    })
  }
} 