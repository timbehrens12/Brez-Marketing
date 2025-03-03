import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  console.log('Shopify auth route hit')
  const { searchParams } = new URL(request.url)
  const brandId = searchParams.get('brandId')
  const connectionId = searchParams.get('connectionId')
  const shop = searchParams.get('shop')

  console.log('Params:', { brandId, connectionId, shop })

  if (!shop || !brandId || !connectionId) {
    console.log('Missing parameters')
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
  }

  try {
    // Verify the connection exists
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('id', connectionId)
      .single()

    if (connectionError || !connection) {
      console.error('Connection not found:', connectionError)
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
    }

    console.log('Found connection:', connection)

    const scopes = [
      'read_products',
      'read_orders',
      'read_customers',
      'read_analytics',
      'read_inventory',
      'read_price_rules',
      'read_discounts'
    ].join(',')

    // Make sure to use the full callback URL with www prefix
    const callbackUrl = 'https://www.brezmarketingdashboard.com/api/shopify/callback'
    
    // Construct auth URL with explicit parameters
    const authUrl = new URL(`https://${shop}/admin/oauth/authorize`)
    authUrl.searchParams.set('client_id', process.env.SHOPIFY_CLIENT_ID!)
    authUrl.searchParams.set('scope', scopes)
    authUrl.searchParams.set('redirect_uri', callbackUrl)
    authUrl.searchParams.set('state', JSON.stringify({ brandId, connectionId }))

    console.log('Redirecting to:', authUrl.toString())
    
    // Use a 302 redirect to ensure the browser follows it properly
    return new Response(null, {
      status: 302,
      headers: {
        'Location': authUrl.toString(),
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    })
  } catch (error) {
    console.error('Shopify auth error:', error)
    return NextResponse.json({ error: 'Failed to start OAuth' }, { status: 500 })
  }
}