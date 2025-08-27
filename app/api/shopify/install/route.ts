import { NextRequest, NextResponse } from 'next/server'

const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_CLIENT_ID
const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.brezmarketingdashboard.com'

// Required scopes for the app
const SCOPES = [
  'read_analytics',
  'read_orders',
  'read_products',
  'read_customers',
  'read_marketing_events',
  'read_reports'
].join(',')

export async function POST(request: NextRequest) {
  try {
    const { shop } = await request.json()

    if (!shop) {
      return NextResponse.json({ error: 'Shop parameter is required' }, { status: 400 })
    }

    if (!SHOPIFY_CLIENT_ID) {
      return NextResponse.json({ error: 'Shopify app not configured' }, { status: 500 })
    }

    // Validate shop domain format
    const shopDomain = shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`
    
    // Generate a random state parameter for security
    const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    
    // Store state in session/database for verification (simplified for now)
    // In production, you'd want to store this securely
    
    // Build OAuth authorization URL
    const authUrl = `https://${shopDomain}/admin/oauth/authorize?` + new URLSearchParams({
      client_id: SHOPIFY_CLIENT_ID,
      scope: SCOPES,
      redirect_uri: `${APP_URL}/api/shopify/callback`,
      state: state,
      grant_options: 'per-user'
    }).toString()

    // Auth URL generated for Shopify OAuth flow

    return NextResponse.json({ 
      authUrl,
      shop: shopDomain,
      state,
      debug: {
        hasClientId: !!SHOPIFY_CLIENT_ID,
        hasClientSecret: !!SHOPIFY_CLIENT_SECRET,
        callbackUrl: `${APP_URL}/api/shopify/callback`
      }
    })

  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to start installation process' 
    }, { status: 500 })
  }
}
