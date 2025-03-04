import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: Request) {
  console.log('Shopify callback route hit')
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const shop = searchParams.get('shop')
  const state = searchParams.get('state')

  console.log('Callback params:', { code: code?.substring(0, 5) + '...', shop, state })

  if (!code || !shop || !state) {
    console.error('Missing required params:', { code: !!code, shop: !!shop, state: !!state })
    return NextResponse.redirect('https://brezmarketingdashboard.com/settings?error=missing_params')
  }

  try {
    // Parse state to get brandId and connectionId
    let brandId, connectionId;
    try {
      const stateObj = JSON.parse(state);
      brandId = stateObj.brandId;
      connectionId = stateObj.connectionId;
      console.log('Parsed state:', { brandId, connectionId })
    } catch (parseError) {
      console.error('Error parsing state:', parseError)
      return NextResponse.redirect('https://brezmarketingdashboard.com/settings?error=invalid_state')
    }

    // Exchange code for access token
    console.log('Exchanging code for access token')
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
      const errorText = await tokenResponse.text()
      console.error('Token exchange failed:', errorText)
      throw new Error(`Failed to get access token: ${tokenResponse.status} - ${errorText}`)
    }

    const tokenData = await tokenResponse.json()
    console.log('Got access token')

    // Update connection in database
    console.log('Updating connection in database')
    const { data: connection, error: updateError } = await supabase
      .from('platform_connections')
      .update({
        status: 'active',
        shop,
        access_token: tokenData.access_token,
        metadata: {
          shop_url: `https://${shop}`
        }
      })
      .eq('id', connectionId)
      .select()
      .single()

    if (updateError || !connection) {
      console.error('Failed to update connection:', updateError)
      throw new Error('Failed to update connection')
    }

    console.log('Connection updated successfully')

    // Trigger initial sync
    console.log('Triggering initial sync')
    const syncResponse = await fetch(new URL('/api/shopify/sync', request.url).toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ connectionId: connection.id })
    })

    if (!syncResponse.ok) {
      console.error('Failed to trigger initial sync')
    } else {
      console.log('Initial sync triggered successfully')
    }

    // Redirect back to settings page
    console.log('Redirecting to settings page')
    return NextResponse.redirect('https://brezmarketingdashboard.com/settings?success=true')
  } catch (error) {
    console.error('Shopify callback error:', error)
    return NextResponse.redirect('https://brezmarketingdashboard.com/settings?error=callback_failed')
  }
} 