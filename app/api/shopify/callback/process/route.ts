import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: Request) {
  console.log('Shopify callback processing route hit')
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const shop = searchParams.get('shop')
  const state = searchParams.get('state')

  console.log('Callback params:', { code: code?.substring(0, 5) + '...', shop, state })

  if (!code || !shop || !state) {
    console.error('Missing required params:', { code: !!code, shop: !!shop, state: !!state })
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
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
      return NextResponse.json({ error: 'Invalid state parameter' }, { status: 400 })
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
      return NextResponse.json({ 
        error: `Failed to get access token: ${tokenResponse.status}` 
      }, { status: 500 })
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
      return NextResponse.json({ 
        error: 'Failed to update connection in database' 
      }, { status: 500 })
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
      // Continue anyway, this is not critical
    } else {
      console.log('Initial sync triggered successfully')
    }

    // Return success
    return NextResponse.json({ 
      success: true,
      message: 'Shopify connection successful',
      connectionId: connection.id
    })
  } catch (error) {
    console.error('Shopify callback error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }, { status: 500 })
  }
} 