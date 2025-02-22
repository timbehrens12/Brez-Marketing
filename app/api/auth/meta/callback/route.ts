import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function GET(request: Request) {
  console.log('=== META CALLBACK START ===')
  console.log('Full URL:', request.url)
  
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  
  console.log('Code:', code?.substring(0, 10) + '...')
  console.log('State:', state)
  console.log('ENV vars present:', {
    META_APP_ID: !!process.env.META_APP_ID,
    META_APP_SECRET: !!process.env.META_APP_SECRET,
    API_URL: process.env.NEXT_PUBLIC_API_URL
  })

  if (!code || !state) {
    console.error('Missing params:', { code: !!code, state: !!state })
    return NextResponse.redirect('/settings?error=missing_params')
  }

  try {
    const tokenUrl = 'https://graph.facebook.com/v18.0/oauth/access_token'
    const redirectUri = `${process.env.NEXT_PUBLIC_API_URL || 'https://brezmarketingdashboard.com'}/api/auth/meta/callback`
    
    console.log('Attempting token exchange with:', {
      tokenUrl,
      redirectUri
    })

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.META_APP_ID,
        client_secret: process.env.META_APP_SECRET,
        code: code,
        redirect_uri: redirectUri,
      }),
    })

    console.log('Token response status:', tokenResponse.status)
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('Token exchange failed:', {
        status: tokenResponse.status,
        error: errorText
      })
      return NextResponse.redirect('/settings?error=token_exchange_failed&details=' + encodeURIComponent(errorText))
    }

    const tokenData = await tokenResponse.json()
    console.log('Token received:', {
      expires_in: tokenData.expires_in,
      token_length: tokenData.access_token?.length
    })

    // Save to Supabase
    console.log('Attempting Supabase insert for brand:', state)
    const { error: dbError } = await supabase
      .from('platform_connections')
      .insert({
        brand_id: state,
        platform_type: 'meta',
        access_token: tokenData.access_token,
        expires_at: new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString(),
        connected_at: new Date().toISOString()
      })

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.redirect('/settings?error=database_error&details=' + encodeURIComponent(dbError.message))
    }

    console.log('=== META CALLBACK SUCCESS ===')
    return NextResponse.redirect('/settings?success=true')
  } catch (error) {
    console.error('=== META CALLBACK FATAL ERROR ===', error)
    return NextResponse.redirect('/settings?error=connection_failed&details=' + encodeURIComponent(error.message))
  }
} 