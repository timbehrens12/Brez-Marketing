import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

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

    // Use a more limited set of scopes to reduce permission requirements
    const scopes = [
      'read_products',
      'read_orders',
      'read_customers',
      'read_inventory'
    ].join(',')

    // Get the host from the request to build the callback URL
    const host = request.headers.get('host') || 'www.brezmarketingdashboard.com'
    const protocol = host.includes('localhost') ? 'http' : 'https'
    
    // IMPORTANT: Use a direct page route instead of an API route for the callback
    // This ensures the callback is handled as a page render, not an API call
    const callbackUrl = `${protocol}://${host}/shopify-callback`
    
    console.log('Using callback URL:', callbackUrl)
    
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