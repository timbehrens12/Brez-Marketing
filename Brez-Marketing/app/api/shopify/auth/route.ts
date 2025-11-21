import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: Request) {
  console.log('Shopify auth route hit')
  const { searchParams } = new URL(request.url)
  const brandId = searchParams.get('brandId')
  const connectionId = searchParams.get('connectionId')
  const shop = searchParams.get('shop')

  console.log('Params:', { brandId, connectionId, shop })

  // For Shopify automated install checks, shop is required but brandId/connectionId may not be provided
  if (!shop) {
    console.log('Missing shop parameter')
    return NextResponse.json({ error: 'Shop parameter is required' }, { status: 400 })
  }

  // If brandId/connectionId are missing, this is likely an automated install check
  if (!brandId || !connectionId) {
    console.log('Automated install detected - brandId/connectionId not provided')
    // For automated checks, we'll use a simple OAuth flow without connection tracking
    const scopes = [
      'read_products',
      'read_orders', 
      'read_customers',
      'read_inventory'
    ].join(',')

    const callbackUrl = 'https://www.brezmarketingdashboard.com/api/shopify/callback'
    const authUrl = new URL(`https://${shop}/admin/oauth/authorize`)
    authUrl.searchParams.set('client_id', process.env.SHOPIFY_CLIENT_ID!)
    authUrl.searchParams.set('scope', scopes)
    authUrl.searchParams.set('redirect_uri', callbackUrl)
    authUrl.searchParams.set('state', JSON.stringify({ automated: true, shop }))

    console.log('Redirecting to automated OAuth:', authUrl.toString())
    return NextResponse.redirect(authUrl.toString())
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

    // Use the exact callback URL that's whitelisted in the Shopify app
    const callbackUrl = 'https://www.brezmarketingdashboard.com/api/shopify/callback'
    
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