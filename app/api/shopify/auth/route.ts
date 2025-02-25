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
    // Generate OAuth URL directly
    const scopes = [
      'read_products',
      'read_orders',
      'read_customers',
      'read_analytics'
    ].join(',')

    const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/shopify/callback`
    const authUrl = `https://${shop}/admin/oauth/authorize?` + new URLSearchParams({
      client_id: process.env.SHOPIFY_CLIENT_ID!,
      scope: scopes,
      redirect_uri: redirectUrl,
      state: JSON.stringify({ brandId, connectionId })
    })

    console.log('Redirecting to:', authUrl)
    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('Shopify auth error:', error)
    return NextResponse.json({ error: 'Failed to start OAuth' }, { status: 500 })
  }
}