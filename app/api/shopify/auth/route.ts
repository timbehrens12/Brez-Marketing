import { shopifyApi, LATEST_API_VERSION } from '@shopify/shopify-api'
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: Request) {
  console.log('Shopify auth route hit')
  const { searchParams } = new URL(request.url)
  const brandId = searchParams.get('brandId')
  const connectionId = searchParams.get('connectionId')
  const shop = searchParams.get('shop')

  console.log('Params:', { brandId, connectionId, shop })

  if (!brandId || !connectionId || !shop) {
    console.log('Missing parameters')
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
  }

  // Initialize Shopify client
  const shopify = shopifyApi({
    apiKey: process.env.SHOPIFY_CLIENT_ID!,
    apiSecretKey: process.env.SHOPIFY_CLIENT_SECRET!,
    scopes: [
      'read_products',
      'read_orders',
      'read_customers',
      'read_analytics'
    ],
    hostName: 'brezmarketingdashboard.com',
    apiVersion: LATEST_API_VERSION,
    isEmbeddedApp: false,
  })

  try {
    console.log('Generating OAuth URL...')
    const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/shopify/callback`
    const authUrl = await shopify.auth.begin({
      shop,
      callbackPath: redirectUrl,
      isOnline: true,
      rawRequest: request
    })

    console.log('Redirecting to:', authUrl)
    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('Shopify auth error:', error)
    return NextResponse.json({ error: 'Failed to start OAuth' }, { status: 500 })
  }
}