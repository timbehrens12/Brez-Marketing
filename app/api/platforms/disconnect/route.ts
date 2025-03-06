import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'

// Create a direct admin client that doesn't require authentication
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: Request) {
  const { brandId, platformType } = await request.json()

  try {
    console.log('Disconnecting platform:', { brandId, platformType })
    
    if (platformType === 'shopify') {
      // Get the connection details first
      const { data: connection, error: connectionQueryError } = await supabaseAdmin
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
      
      // Store connection details for later use
      const connectionDetails = {
        id: connection.id,
        access_token: connection.access_token,
        shop: connection.shop
      }

      // Delete all related data first
      
      // Check if shopify_orders table exists and delete all orders for this connection
      try {
        console.log('Deleting orders for connection:', connection.id)
        const { error: ordersError } = await supabaseAdmin
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
        console.log('Deleting inventory for connection:', connection.id)
        const { error: inventoryError } = await supabaseAdmin
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
      
      // Delete the connection record FIRST to ensure it's gone from our system
      console.log('Deleting connection record:', connection.id)
      const { error: connectionError } = await supabaseAdmin
        .from('platform_connections')
        .delete()
        .eq('id', connection.id)

      if (connectionError) {
        console.error('Error deleting connection:', connectionError)
        return NextResponse.json(
          { error: 'Failed to delete connection' },
          { status: 500 }
        )
      }
      
      // Now try to revoke the access token with Shopify
      if (connectionDetails.access_token && connectionDetails.shop) {
        try {
          console.log('Revoking Shopify access token')
          
          // Attempt to revoke the token
          const revokeResponse = await fetch(`https://${connectionDetails.shop}/admin/api/2023-04/access_tokens/current.json`, {
            method: 'DELETE',
            headers: {
              'X-Shopify-Access-Token': connectionDetails.access_token,
              'Content-Type': 'application/json'
            }
          })
          
          if (!revokeResponse.ok) {
            console.error('Failed to revoke token, but continuing with disconnect:', {
              status: revokeResponse.status,
              statusText: revokeResponse.statusText
            })
            // Continue anyway - we've already deleted the local connection
          } else {
            console.log('Successfully revoked Shopify access token')
          }
        } catch (revokeError) {
          console.error('Error revoking Shopify token:', revokeError)
          // Continue anyway - we've already deleted the local connection
        }
      }
      
      return NextResponse.json({ success: true })
    } else {
      // For other platform types, just delete the connection
      const { error: connectionError } = await supabaseAdmin
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
    }
  } catch (error) {
    console.error('Error disconnecting platform:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect platform' },
      { status: 500 }
    )
  }
}