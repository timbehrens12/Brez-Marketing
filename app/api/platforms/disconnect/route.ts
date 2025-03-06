import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: Request) {
  const { brandId, platformType } = await request.json()

  try {
    console.log('Disconnecting platform:', { brandId, platformType })
    
    // First, get the connection details
    if (platformType === 'shopify') {
      // Get the connection details first
      const { data: connection, error: connectionQueryError } = await supabase
        .from('platform_connections')
        .select('id, access_token, shop')
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

      console.log('Processing connection:', connection.id)

      // Try to revoke the access token with Shopify
      if (connection.access_token && connection.shop) {
        try {
          console.log('Revoking Shopify access token')
          
          // Attempt to revoke the token
          const revokeResponse = await fetch(`https://${connection.shop}/admin/api/2023-04/access_tokens/current.json`, {
            method: 'DELETE',
            headers: {
              'X-Shopify-Access-Token': connection.access_token,
              'Content-Type': 'application/json'
            }
          })
          
          if (!revokeResponse.ok) {
            console.error('Failed to revoke token, but continuing with disconnect:', {
              status: revokeResponse.status,
              statusText: revokeResponse.statusText
            })
            // Continue anyway - we'll still delete the local connection
          } else {
            console.log('Successfully revoked Shopify access token')
          }
        } catch (revokeError) {
          console.error('Error revoking Shopify token:', revokeError)
          // Continue anyway - we'll still delete the local connection
        }
      }

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
      
      // Check if shopify_inventory table exists and delete all inventory for this connection
      try {
        const { error: inventoryError } = await supabase
          .from('shopify_inventory')
          .delete()
          .eq('connection_id', connection.id)

        if (inventoryError) {
          console.error('Error deleting inventory:', inventoryError)
          // Continue anyway - the table might not exist
        }
      } catch (error) {
        console.error('Error with shopify_inventory table:', error)
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