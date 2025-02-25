import { shopifyApi, LATEST_API_VERSION } from '@shopify/shopify-api'
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const shop = searchParams.get('shop')
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  
  const { brandId, connectionId } = JSON.parse(state || '{}')

  if (!shop || !code || !brandId || !connectionId) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
  }

  try {
    const shopify = shopifyApi({
      apiKey: process.env.SHOPIFY_API_KEY!,
      apiSecretKey: process.env.SHOPIFY_API_SECRET!,
      scopes: ['read_products', 'read_orders', 'read_customers', 'read_analytics'],
      hostName: process.env.SHOPIFY_APP_URL!,
      apiVersion: LATEST_API_VERSION,
      isEmbeddedApp: false,
    })

    // Complete OAuth
    const callbackResponse = await shopify.auth.callback({
      rawRequest: request
    })

    const accessToken = callbackResponse.session.accessToken
    
    // Update connection in database
    const { error } = await supabase
      .from('platform_connections')
      .update({
        status: 'active',
        shop,
        access_token: accessToken,
        metadata: {
          shop_url: `https://${shop}`
        }
      })
      .eq('id', connectionId)

    if (error) throw error

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings`)
  } catch (error) {
    console.error('Shopify OAuth error:', error)
    return NextResponse.json({ error: 'OAuth failed' }, { status: 500 })
  }
} 