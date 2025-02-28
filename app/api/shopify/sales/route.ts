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
      .eq('platform_type', 'shopify')
      .eq('brand_id', brandId)
      .eq('status', 'active')
      .single()

    if (!connection) {
      return NextResponse.json({ sales: [] })
    }

    const { data: sales } = await supabase
      .from('shopify_data')
      .select('*')
      .eq('connection_id', connection.id)
      .order('created_at', { ascending: false })

    return NextResponse.json({ sales: sales || [] })
  } catch (error) {
    console.error('Error fetching Shopify sales:', error)
    return NextResponse.json({ error: 'Failed to fetch sales' }, { status: 500 })
  }
} 