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
    tokenUrl.searchParams.append('redirect_uri', `${process.env.FRONTEND_URL}/api/auth/meta/callback`)

    console.log('Requesting token with URL:', tokenUrl.toString())

    // Exchange code for access token
    const tokenResponse = await fetch(tokenUrl.toString(), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    })

    const tokenData = await tokenResponse.json()
    console.log('Token response:', tokenData) // Debug logging

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error('Token response error:', tokenData)
      throw new Error(tokenData.error?.message || 'Failed to get access token')
    }

    console.log('Successfully got access token, storing in database...')

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

    console.log('Successfully stored connection, redirecting to settings...')
    return NextResponse.redirect(`${process.env.FRONTEND_URL}/settings?success=meta_connected`)
  } catch (error) {
    console.error('Error in Meta callback:', error)
    return NextResponse.redirect(`${process.env.FRONTEND_URL}/settings?error=meta_connection_failed`)
  }
} 