import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'
import { registerShopifyWebhooks } from '@/lib/services/shopify-service'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const shop = searchParams.get('shop')
  const state = searchParams.get('state') // This is our brandId

  console.log('Shopify callback received:', { shop, code, state })

  if (!shop || !code || !state) {
    console.error('Missing required params:', { shop, code, state })
    return NextResponse.redirect('/settings?error=missing_params')
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.SHOPIFY_CLIENT_ID,
        client_secret: process.env.SHOPIFY_CLIENT_SECRET,
        code,
      }),
    })

    if (!tokenResponse.ok) {
      throw new Error('Failed to get access token')
    }

    const { access_token } = await tokenResponse.json()

    // Save the connection to Supabase
    const { error } = await supabase
      .from('platform_connections')
      .insert([{
        brand_id: state,
        platform_type: 'shopify',
        store_url: shop,
        access_token: access_token,
        connected_at: new Date().toISOString()
      }])

    if (error) throw error

    // Register the webhook
    await registerShopifyWebhooks(shop, access_token)

    // Redirect back to settings with success
    return NextResponse.redirect('/settings?success=true')
  } catch (error) {
    console.error('Error in Shopify callback:', error)
    return NextResponse.redirect('/settings?error=connection_failed')
  }
} 