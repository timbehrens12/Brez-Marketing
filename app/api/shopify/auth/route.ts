import { shopifyApi, LATEST_API_VERSION } from '@shopify/shopify-api'
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const brandId = searchParams.get('brandId')
  const connectionId = searchParams.get('connectionId')
  const shop = searchParams.get('shop')

  if (!brandId || !connectionId || !shop) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
  }

  // Initialize Shopify client
  const shopify = shopifyApi({
    apiKey: process.env.SHOPIFY_API_KEY!,
    apiSecretKey: process.env.SHOPIFY_API_SECRET!,
    scopes: [
      'read_products',
      'read_orders',
      'read_customers',
      'read_analytics'
    ],
    hostName: process.env.SHOPIFY_APP_URL!,
    apiVersion: LATEST_API_VERSION,
    isEmbeddedApp: false,
  })

  // Generate OAuth URL
  const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/shopify/callback`
  const authUrl = await shopify.auth.begin({
    shop,
    callbackPath: redirectUrl,
    isOnline: true,
    rawRequest: request
  })

  return NextResponse.redirect(authUrl)
} 