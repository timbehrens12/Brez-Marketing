import { NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase/client'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const brandId = searchParams.get('brandId')
  
  if (!brandId) {
    return NextResponse.json({ error: 'Missing brandId' }, { status: 400 })
  }

  try {
    // Get the Shopify connection for this brand
    const supabase = getSupabaseClient()
  const { data: connection } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('brand_id', brandId)
      .eq('platform_type', 'shopify')
      .single()

    if (!connection) {
      return NextResponse.json({ error: 'No Shopify connection found' }, { status: 404 })
    }

    // Fetch data from Shopify API using the stored access token
    const shopifyResponse = await fetch(`https://${connection.shop}/admin/api/2024-01/orders/count.json`, {
      headers: {
        'X-Shopify-Access-Token': connection.access_token,
      },
    })

    const data = await shopifyResponse.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
} 