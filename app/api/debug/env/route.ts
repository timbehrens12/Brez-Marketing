import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  // Only show this in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  // Get all environment variables that start with SHOPIFY
  const shopifyEnvVars: Record<string, string> = {}
  
  for (const key in process.env) {
    if (key.includes('SHOPIFY')) {
      // Mask the actual values for security
      shopifyEnvVars[key] = process.env[key]?.substring(0, 3) + '...' || 'undefined'
    }
  }

  return NextResponse.json({
    shopifyEnvVars,
    nextPublicShopifyClientId: process.env.NEXT_PUBLIC_SHOPIFY_CLIENT_ID?.substring(0, 3) + '...' || 'undefined',
    shopifyClientId: process.env.SHOPIFY_CLIENT_ID?.substring(0, 3) + '...' || 'undefined',
    nodeEnv: process.env.NODE_ENV,
  })
} 