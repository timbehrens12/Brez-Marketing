import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shop = searchParams.get('shop') || 'brez-marketing-test-store.myshopify.com'
    const connectionId = searchParams.get('connectionId') || '3b995858-5373-47da-b716-3966202d76ba'
    
    console.log('[Manual Sync] Starting sync for:', { shop, connectionId })
    
    const supabase = createClient()
    
    // Get the connection details
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('id', connectionId)
      .single()
    
    if (connectionError || !connection) {
      return NextResponse.json({ 
        error: 'Connection not found', 
        details: connectionError?.message 
      }, { status: 404 })
    }
    
    console.log('[Manual Sync] Found connection, fetching orders from Shopify...')
    
    // Fetch orders from Shopify API
    const ordersResponse = await fetch(`https://${shop}/admin/api/2024-01/orders.json?limit=250&status=any`, {
      headers: {
        'X-Shopify-Access-Token': connection.access_token,
      },
    })
    
    if (!ordersResponse.ok) {
      return NextResponse.json({ 
        error: 'Failed to fetch orders from Shopify',
        status: ordersResponse.status,
        statusText: ordersResponse.statusText
      }, { status: 500 })
    }
    
    const ordersData = await ordersResponse.json()
    const orders = ordersData.orders || []
    
    console.log('[Manual Sync] Fetched', orders.length, 'orders, storing in database...')
    
    let storedOrders = 0
    const errors = []
    
    // Store orders in database
    for (const order of orders) {
      try {
        const { error: insertError } = await supabase
          .from('shopify_orders')
          .upsert({
            id: parseInt(order.id),
            connection_id: connection.id,
            brand_id: connection.brand_id,
            user_id: connection.user_id,
            order_number: order.order_number,
            total_price: parseFloat(order.total_price),
            subtotal_price: parseFloat(order.subtotal_price || order.total_price),
            total_tax: parseFloat(order.total_tax || '0'),
            total_discounts: parseFloat(order.total_discounts || '0'),
            created_at: order.created_at,
            financial_status: order.financial_status,
            fulfillment_status: order.fulfillment_status,
            customer_email: order.email,
            currency: order.currency,
            customer_id: order.customer?.id ? parseInt(order.customer.id) : null,
            line_items: order.line_items || []
          }, { onConflict: 'id' })
        
        if (insertError) {
          console.error('[Manual Sync] Error storing order', order.id, ':', insertError)
          errors.push({ orderId: order.id, error: insertError.message })
        } else {
          storedOrders++
          console.log('[Manual Sync] Stored order:', order.id, 'for $' + order.total_price)
        }
        
      } catch (orderError) {
        console.error('[Manual Sync] Exception storing order', order.id, ':', orderError)
        errors.push({ orderId: order.id, error: orderError instanceof Error ? orderError.message : 'Unknown error' })
      }
    }
    
    // Update sync status
    await supabase
      .from('platform_connections')
      .update({
        sync_status: errors.length > 0 ? 'completed_with_errors' : 'completed',
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', connectionId)
    
    return NextResponse.json({
      success: true,
      message: `Manual sync completed`,
      results: {
        ordersFromShopify: orders.length,
        ordersStored: storedOrders,
        errors: errors.length,
        errorDetails: errors
      },
      testAgain: `Check: https://www.brezmarketingdashboard.com/api/shopify/test-connection?shop=${shop}`
    })
    
  } catch (error) {
    console.error('[Manual Sync] Error:', error)
    return NextResponse.json({
      error: 'Manual sync failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
