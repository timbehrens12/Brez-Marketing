import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

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
      return NextResponse.json({ customers: [] })
    }

    const { data: customers } = await supabase
      .from('shopify_orders')
      .select('customer_id')
      .eq('connection_id', connection.id)
      .not('customer_id', 'is', null)

    // Get unique customers
    const uniqueCustomers = [...new Set(customers?.map(c => c.customer_id))]

    return NextResponse.json({ customers: uniqueCustomers })
  } catch (error) {
    console.error('Error fetching customers:', error)
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 })
  }
} 