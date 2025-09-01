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

// GDPR Customer Data Request Webhook
export async function POST(request: NextRequest) {
  try {
    // Verify Shopify webhook HMAC first
    const hmacHeader = request.headers.get('x-shopify-hmac-sha256')
    const shopHeader = request.headers.get('x-shopify-shop-domain')
    
    if (!hmacHeader || !shopHeader) {
      console.error('[GDPR Data Request] Missing required headers:', { 
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
        console.error('🚨 SECURITY: HMAC verification failed for GDPR data request webhook')
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      
      console.log('🔒 SECURE: GDPR data request webhook HMAC verification successful')
    } catch (error) {
      console.error('🚨 SECURITY: Error verifying HMAC:', error)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = JSON.parse(rawBody)
    const { shop_id, shop_domain, customer, orders_requested } = payload

    console.log('[Shopify GDPR] Customer data request received:', {
      shop_domain,
      customer_id: customer?.id,
      orders_count: orders_requested?.length || 0
    })

    // Store the data request for compliance tracking
    const supabase = createClient()
    
    const { error } = await supabase
      .from('gdpr_requests')
      .insert({
        type: 'customer_data_request',
        shop_domain,
        shop_id: shop_id?.toString(),
        customer_id: customer?.id?.toString(),
        request_data: payload,
        status: 'received',
        created_at: new Date().toISOString()
      })

    if (error) {
      console.error('[Shopify GDPR] Error storing data request:', error)
    }

    // For now, we'll handle these manually
    // In production, you'd implement automated data export
    
    return NextResponse.json({ 
      message: 'Customer data request received and will be processed within 30 days',
      status: 'received'
    })

  } catch (error) {
    console.error('[Shopify GDPR] Customer data request error:', error)
    return NextResponse.json({ 
      error: 'Failed to process data request' 
    }, { status: 500 })
  }
}
