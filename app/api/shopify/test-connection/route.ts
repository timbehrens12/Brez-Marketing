import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shop = searchParams.get('shop') || 'brez-marketing-test-store.myshopify.com'
    
    const supabase = createClient()
    
    console.log('[Test Connection] Checking connection for shop:', shop)
    
    // Check if connection exists
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('platform_type', 'shopify')
      .eq('shop', shop)
      .single()
    
    if (connectionError) {
      console.error('[Test Connection] Connection error:', connectionError)
      return NextResponse.json({ 
        error: 'Connection not found', 
        details: connectionError.message 
      }, { status: 404 })
    }
    
    console.log('[Test Connection] Found connection:', {
      id: connection.id,
      status: connection.status,
      sync_status: connection.sync_status,
      last_synced_at: connection.last_synced_at,
      brand_id: connection.brand_id
    })
    
    // Check for recent orders
    const { data: orders, error: ordersError } = await supabase
      .from('shopify_orders')
      .select(`
        *,
        brands!inner(name)
      `)
      .eq('connection_id', connection.id)
      .eq('brand_id', connection.brand_id)
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (ordersError) {
      console.error('[Test Connection] Orders error:', ordersError)
    }
    
    // Regional sales data is calculated from orders, not stored separately
    
    // Try to fetch a recent order directly from Shopify API to test the connection
    let shopifyData = null
    if (connection.access_token) {
      try {
        const shopifyResponse = await fetch(`https://${shop}/admin/api/2024-01/orders.json?limit=5&status=any`, {
          headers: {
            'X-Shopify-Access-Token': connection.access_token,
          },
        })
        
        if (shopifyResponse.ok) {
          shopifyData = await shopifyResponse.json()
          console.log('[Test Connection] Shopify API response:', {
            orderCount: shopifyData.orders?.length || 0,
            orders: shopifyData.orders?.map((order: any) => ({
              id: order.id,
              order_number: order.order_number,
              total_price: order.total_price,
              created_at: order.created_at
            })) || []
          })
        } else {
          console.error('[Test Connection] Shopify API error:', shopifyResponse.status, shopifyResponse.statusText)
        }
      } catch (apiError) {
        console.error('[Test Connection] Error calling Shopify API:', apiError)
      }
    }
    
    return NextResponse.json({
      connection: {
        id: connection.id,
        shop: connection.shop,
        status: connection.status,
        sync_status: connection.sync_status,
        last_synced_at: connection.last_synced_at,
        brand_id: connection.brand_id,
        has_access_token: !!connection.access_token
      },
      database_orders: orders || [],
      shopify_api_orders: shopifyData?.orders || [],
      summary: {
        connection_exists: true,
        orders_in_db: orders?.length || 0,
        orders_from_api: shopifyData?.orders?.length || 0,
        total_from_api: shopifyData?.orders?.reduce((sum: number, order: any) => sum + parseFloat(order.total_price || 0), 0) || 0,
        total_in_db: orders?.reduce((sum: number, order: any) => sum + parseFloat(order.total_price || 0), 0) || 0
      }
    })
    
  } catch (error) {
    console.error('[Test Connection] Error:', error)
    return NextResponse.json({ 
      error: 'Failed to test connection',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
