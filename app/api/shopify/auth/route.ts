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

  try {
    const scopes = [
      'read_products',
      'read_orders',
      'read_customers',
      'read_analytics'
    ].join(',')

    // Make sure to use the full callback URL
    const callbackUrl = 'https://brezmarketingdashboard.com/api/shopify/callback'
    
    // Construct auth URL with explicit parameters
    const authUrl = new URL(`https://${shop}/admin/oauth/authorize`)
    authUrl.searchParams.set('client_id', process.env.SHOPIFY_CLIENT_ID!)
    authUrl.searchParams.set('scope', scopes)
    authUrl.searchParams.set('redirect_uri', callbackUrl)
    authUrl.searchParams.set('state', JSON.stringify({ brandId, connectionId }))

    console.log('Redirecting to:', authUrl.toString())
    return NextResponse.redirect(authUrl.toString())
  } catch (error) {
    console.error('Shopify auth error:', error)
    return NextResponse.json({ error: 'Failed to start OAuth' }, { status: 500 })
  }
}