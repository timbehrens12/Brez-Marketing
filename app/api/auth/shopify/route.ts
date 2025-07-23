import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const shop = searchParams.get('shop')
  const brandId = searchParams.get('brandId')

  if (!shop || !brandId) {
    return NextResponse.redirect('/settings?error=missing_params')
  }

  // Your Shopify app credentials
  const clientId = process.env.SHOPIFY_CLIENT_ID
  const scopes = 'read_orders,read_products,read_customers'
  const redirectUri = `${process.env.NEXT_PUBLIC_API_URL}/api/auth/shopify/callback`

  // Construct Shopify OAuth URL
  const shopifyAuthUrl = `https://${shop}/admin/oauth/authorize?` +
    `client_id=${clientId}&` +
    `scope=${scopes}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `state=${brandId}`

  return NextResponse.redirect(shopifyAuthUrl)
}