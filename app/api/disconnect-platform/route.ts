import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies })
  const { brandId, platformType } = await request.json()

  try {
    // First, delete all related orders
    if (platformType === 'shopify') {
      // Get the connection ID first
      const { data: connection, error: connectionQueryError } = await supabase
        .from('platform_connections')
        .select('id')
        .eq('brand_id', brandId)
        .eq('platform_type', platformType)
        .single()

      if (connectionQueryError) {
        console.error('Error finding connection:', connectionQueryError)
        return NextResponse.json(
          { error: 'Connection not found' },
          { status: 404 }
        )
      }

      // Delete all orders for this connection
      const { error: ordersError } = await supabase
        .from('shopify_orders')
        .delete()
        .eq('connection_id', connection.id)

      if (ordersError) {
        console.error('Error deleting orders:', ordersError)
        return NextResponse.json(
          { error: 'Failed to delete related orders' },
          { status: 500 }
        )
      }
    }

    // Then delete the connection
    const { error: connectionError } = await supabase
      .from('platform_connections')
      .delete()
      .eq('brand_id', brandId)
      .eq('platform_type', platformType)

    if (connectionError) {
      console.error('Error deleting connection:', connectionError)
      return NextResponse.json(
        { error: 'Failed to delete connection' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error disconnecting platform:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect platform' },
      { status: 500 }
    )
  }
} 