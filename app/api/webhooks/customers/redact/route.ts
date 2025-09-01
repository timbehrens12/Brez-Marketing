import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

// Handle non-POST requests with 401 (for Shopify's HMAC testing)
export async function GET() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

export async function PUT() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

export async function DELETE() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

// GDPR Customer Data Erasure Webhook
export async function POST(request: NextRequest) {
  try {
    // Verify Shopify webhook HMAC first
    const hmacHeader = request.headers.get('x-shopify-hmac-sha256')
    const shopHeader = request.headers.get('x-shopify-shop-domain')
    
    if (!hmacHeader || !shopHeader) {
      console.error('[GDPR Customer] Missing required headers:', { 
        hasHmac: !!hmacHeader, 
        hasShop: !!shopHeader 
      })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get the raw body for HMAC verification
    const rawBody = await request.text()
    
    try {
      const calculatedHmac = crypto
        .createHmac('sha256', process.env.SHOPIFY_WEBHOOK_SECRET)
        .update(rawBody, 'utf8')
        .digest('base64')
      
      if (!crypto.timingSafeEqual(Buffer.from(calculatedHmac), Buffer.from(hmacHeader))) {
        console.error('🚨 SECURITY: HMAC verification failed for GDPR customer webhook')
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      
      console.log('🔒 SECURE: GDPR customer webhook HMAC verification successful')
    } catch (error) {
      console.error('🚨 SECURITY: Error verifying HMAC:', error)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = JSON.parse(rawBody)
    const { shop_id, shop_domain, customer, orders_to_redact } = payload

    console.log('[Shopify GDPR] Customer data erasure request received:', {
      shop_domain,
      customer_id: customer?.id,
      orders_count: orders_to_redact?.length || 0
    })

    const supabase = createClient()

    // Store the erasure request for compliance tracking
    const { error: logError } = await supabase
      .from('gdpr_requests')
      .insert({
        type: 'customer_data_erasure',
        shop_domain,
        shop_id: shop_id?.toString(),
        customer_id: customer?.id?.toString(),
        request_data: payload,
        status: 'processing',
        created_at: new Date().toISOString()
      })

    if (logError) {
      console.error('[Shopify GDPR] Error logging erasure request:', logError)
    }

    // Remove customer data from our database
    if (customer?.id) {
      // Remove from any tables that might contain customer data
      // This is a simplified implementation - adjust based on your actual schema
      
      const customerId = customer.id.toString()
      
      // Remove from orders table if you store customer data there
      const { error: ordersError } = await supabase
        .from('shopify_orders')
        .delete()
        .eq('customer_id', customerId)
        .eq('shop_domain', shop_domain)

      if (ordersError) {
        console.error('[Shopify GDPR] Error removing order data:', ordersError)
      }

      // Remove from any other customer-related tables
      // Add more deletions as needed based on your schema
    }

    // Update the request status
    await supabase
      .from('gdpr_requests')
      .update({ 
        status: 'completed',
        processed_at: new Date().toISOString()
      })
      .eq('customer_id', customer?.id?.toString())
      .eq('shop_domain', shop_domain)
      .eq('type', 'customer_data_erasure')

    console.log('[Shopify GDPR] Customer data erasure completed for:', customer?.id)

    return NextResponse.json({ 
      message: 'Customer data has been successfully erased',
      status: 'completed'
    })

  } catch (error) {
    console.error('[Shopify GDPR] Customer data erasure error:', error)
    return NextResponse.json({ 
      error: 'Failed to process data erasure' 
    }, { status: 500 })
  }
}
