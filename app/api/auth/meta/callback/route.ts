import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  console.log('Callback received:', { code, state, error }) // Debug logging

  if (error) {
    console.error('Meta auth error:', error)
    return NextResponse.redirect(`${process.env.FRONTEND_URL}/settings?error=meta_auth_failed`)
  }

  if (!code || !state) {
    console.error('Missing code or state:', { code, state })
    return NextResponse.redirect(`${process.env.FRONTEND_URL}/settings?error=invalid_callback`)
  }

  try {
    // Construct token URL with all required parameters
    const tokenUrl = new URL('https://graph.facebook.com/v18.0/oauth/access_token')
    tokenUrl.searchParams.append('client_id', process.env.META_APP_ID!)
    tokenUrl.searchParams.append('client_secret', process.env.META_APP_SECRET!)
    tokenUrl.searchParams.append('code', code)
    tokenUrl.searchParams.append('redirect_uri', `${process.env.API_URL}/api/auth/meta/callback`)

    console.log('Requesting token with URL:', tokenUrl.toString())

    // Exchange code for access token
    const tokenResponse = await fetch(tokenUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      cache: 'no-store',
    }).catch(error => {
      console.error('Fetch error:', error)
      throw error
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('Token response not ok:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        body: errorText
      })
      throw new Error(`Token response not ok: ${tokenResponse.status} ${tokenResponse.statusText}`)
    }

    const tokenData = await tokenResponse.json()
    console.log('Token response:', tokenData)

    if (!tokenData.access_token) {
      console.error('No access token in response:', tokenData)
      throw new Error('No access token received')
    }

    // Store the connection in database
    const { error: dbError } = await supabase
      .from('platform_connections')
      .insert([{
        brand_id: state,
        platform_type: 'meta',
        access_token: tokenData.access_token,
        connected_at: new Date().toISOString(),
        status: 'active'
      }])

    if (dbError) {
      console.error('Database error:', dbError)
      throw dbError
    }

    // Redirect back to settings page with success message
    const redirectUrl = new URL(`${process.env.FRONTEND_URL}/settings`)
    redirectUrl.searchParams.append('success', 'meta_connected')
    
    return NextResponse.redirect(redirectUrl.toString())
  } catch (error) {
    console.error('Error in Meta callback:', error)
    const redirectUrl = new URL(`${process.env.FRONTEND_URL}/settings`)
    redirectUrl.searchParams.append('error', 'meta_connection_failed')
    return NextResponse.redirect(redirectUrl.toString())
  }
} 