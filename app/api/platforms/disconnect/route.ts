import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: Request) {
  const { brandId, platformType } = await request.json()

  try {
    console.log('Disconnecting platform:', { brandId, platformType })
    
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

      console.log('Found connection:', connection)

      // Check if shopify_orders table exists and delete all orders for this connection
      try {
        const { error: ordersError } = await supabase
          .from('shopify_orders')
          .delete()
          .eq('connection_id', connection.id)

        if (ordersError) {
          console.error('Error deleting orders:', ordersError)
          // Continue anyway - the table might not exist
        }
      } catch (error) {
        console.error('Error with shopify_orders table:', error)
        // Continue anyway - the table might not exist
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