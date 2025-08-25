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

// GDPR Shop Data Erasure Webhook
export async function POST(request: NextRequest) {
  // BULLETPROOF: Always return 401 for any validation failure to satisfy Shopify
  try {
    console.log('[GDPR Shop] Webhook request received')
    
    // Get headers safely
    let hmacHeader: string | null = null
    let shopHeader: string | null = null
    
    try {
      hmacHeader = request.headers.get('x-shopify-hmac-sha256')
      shopHeader = request.headers.get('x-shopify-shop-domain')
    } catch (headerError) {
      console.error('[GDPR Shop] Header access error:', headerError)
      return new Response('Unauthorized', { status: 401 })
    }
    
    // Missing headers = 401
    if (!hmacHeader || !shopHeader) {
      console.log('[GDPR Shop] Missing headers, returning 401')
      return new Response('Unauthorized', { status: 401 })
    }
    
    // Get raw body safely
    let rawBody: string
    try {
      rawBody = await request.text()
    } catch (bodyError) {
      console.error('[GDPR Shop] Body read error:', bodyError)
      return new Response('Unauthorized', { status: 401 })
    }
    
    // Missing webhook secret = 401
    if (!process.env.SHOPIFY_WEBHOOK_SECRET) {
      console.log('[GDPR Shop] Missing webhook secret, returning 401')
      return new Response('Unauthorized', { status: 401 })
    }
    
    // HMAC validation
    try {
      const calculatedHmac = crypto
        .createHmac('sha256', process.env.SHOPIFY_WEBHOOK_SECRET)
        .update(rawBody, 'utf8')
        .digest('base64')
      
      if (!crypto.timingSafeEqual(Buffer.from(calculatedHmac), Buffer.from(hmacHeader))) {
        console.log('[GDPR Shop] HMAC mismatch, returning 401')
        return new Response('Unauthorized', { status: 401 })
      }
      
      console.log('[GDPR Shop] HMAC valid')
    } catch (hmacError) {
      console.error('[GDPR Shop] HMAC error:', hmacError)
      return new Response('Unauthorized', { status: 401 })
    }

    // Parse payload safely
    let payload: any
    try {
      payload = JSON.parse(rawBody)
    } catch (parseError) {
      console.error('[GDPR Shop] Parse error:', parseError)
      return new Response('Unauthorized', { status: 401 })
    }
    const { shop_id, shop_domain } = payload

    console.log('[Shopify GDPR] Shop data erasure request received:', {
      shop_domain,
      shop_id
    })

    const supabase = createClient()

    // Store the erasure request for compliance tracking
    const { error: logError } = await supabase
      .from('gdpr_requests')
      .insert({
        type: 'shop_data_erasure',
        shop_domain,
        shop_id: shop_id?.toString(),
        request_data: payload,
        status: 'processing',
        created_at: new Date().toISOString()
      })

    if (logError) {
      console.error('[Shopify GDPR] Error logging shop erasure request:', logError)
    }

    // Remove all shop data from our database
    const shopDomain = shop_domain

    // Remove from platform_connections
    const { error: connectionError } = await supabase
      .from('platform_connections')
      .delete()
      .eq('shop_domain', shopDomain)
      .eq('platform', 'shopify')

    if (connectionError) {
      console.error('[Shopify GDPR] Error removing connection:', connectionError)
    }

    // Remove from shopify_orders
    const { error: ordersError } = await supabase
      .from('shopify_orders')
      .delete()
      .eq('shop_domain', shopDomain)

    if (ordersError) {
      console.error('[Shopify GDPR] Error removing orders:', ordersError)
    }

    // Remove from shopify_products
    const { error: productsError } = await supabase
      .from('shopify_products')
      .delete()
      .eq('shop_domain', shopDomain)

    if (productsError) {
      console.error('[Shopify GDPR] Error removing products:', productsError)
    }

    // Remove from any other Shopify-related tables
    // Add more deletions as needed based on your schema

    // Update the request status
    await supabase
      .from('gdpr_requests')
      .update({ 
        status: 'completed',
        processed_at: new Date().toISOString()
      })
      .eq('shop_domain', shopDomain)
      .eq('type', 'shop_data_erasure')

    console.log('[Shopify GDPR] Shop data erasure completed for:', shopDomain)

    return NextResponse.json({ 
      message: 'Shop data has been successfully erased',
      status: 'completed'
    })

  } catch (error) {
    console.error('[Shopify GDPR] Shop data erasure error:', error)
    return NextResponse.json({ 
      error: 'Failed to process shop data erasure' 
    }, { status: 500 })
  }
}
