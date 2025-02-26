import { supabase } from '@/lib/supabase'
import { headers } from 'next/headers'

export async function POST(request: Request) {
  const payload = await request.json()
  console.log('Received Shopify order webhook:', payload)

  // Get shop domain from headers
  const shopDomain = headers().get('x-shopify-shop-domain')

  try {
    // Get connection_id from platform_connections using shop domain
    const { data: connection } = await supabase
      .from('platform_connections')
      .select('id')
      .eq('shop', shopDomain)
      .single()

    if (!connection) {
      throw new Error(`No connection found for shop: ${shopDomain}`)
    }

    const { error } = await supabase
      .from('shopify_orders')
      .insert({
        id: payload.id,
        created_at: payload.created_at,
        total_price: payload.total_price,
        customer_id: payload.customer?.id,
        line_items: payload.line_items,
        connection_id: connection.id
      })

    if (error) throw error
    console.log('Successfully saved order to Supabase')
    
    return new Response('OK')
  } catch (error) {
    console.error('Error saving order:', error)
    return new Response('Error', { status: 500 })
  }
} 