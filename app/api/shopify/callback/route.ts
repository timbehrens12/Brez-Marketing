import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const shop = searchParams.get('shop')
  const state = searchParams.get('state')

  if (!code || !shop || !state) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
  }

  try {
    // Parse state to get brandId and connectionId
    const { brandId, connectionId } = JSON.parse(state)

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

    const { access_token } = await tokenResponse.json()

    // Update connection in database
    const { error } = await supabase
      .from('platform_connections')
      .update({
        status: 'active',
        shop,
        access_token,
        metadata: {
          shop_url: `https://${shop}`
        }
      })
      .eq('id', connectionId)

    if (error) throw error

    // Redirect back to settings page
    return NextResponse.redirect('https://brezmarketingdashboard.com/settings')
  } catch (error) {
    console.error('Shopify callback error:', error)
    return NextResponse.redirect('https://brezmarketingdashboard.com/settings?error=callback_failed')
  }
} 