import { NextRequest, NextResponse } from 'next/server'

// Debug endpoint to check Shopify app configuration
export async function GET(request: NextRequest) {
  const config = {
    hasClientId: !!process.env.SHOPIFY_CLIENT_ID,
    hasClientSecret: !!process.env.SHOPIFY_CLIENT_SECRET,
    appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://www.brezmarketingdashboard.com',
    clientIdLength: process.env.SHOPIFY_CLIENT_ID?.length || 0,
    secretLength: process.env.SHOPIFY_CLIENT_SECRET?.length || 0,
    installUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.brezmarketingdashboard.com'}/shopify/install`,
    callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.brezmarketingdashboard.com'}/api/shopify/callback`,
    preferencesUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.brezmarketingdashboard.com'}/shopify/preferences`
  }

  return NextResponse.json(config)
}
