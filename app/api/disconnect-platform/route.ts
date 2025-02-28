import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies })
  const { brandId, platformType } = await request.json()

  try {
    // First, delete all related orders
    if (platformType === 'shopify') {
      const { error: ordersError } = await supabase
        .from('shopify_orders')
        .delete()
        .eq('connection_id', (
          await supabase
            .from('platform_connections')
            .select('id')
            .eq('brand_id', brandId)
            .eq('platform_type', platformType)
            .single()
        ).data?.id)

      if (ordersError) throw ordersError
    }

    // Then delete the connection
    const { error: connectionError } = await supabase
      .from('platform_connections')
      .delete()
      .eq('brand_id', brandId)
      .eq('platform_type', platformType)

    if (connectionError) throw connectionError

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error disconnecting platform:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect platform' },
      { status: 500 }
    )
  }
} 