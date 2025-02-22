import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state') // brandId
  
  if (!code || !state) {
    return NextResponse.redirect('/settings?error=missing_params')
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://graph.facebook.com/v18.0/oauth/access_token', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.META_CLIENT_ID,
        client_secret: process.env.META_CLIENT_SECRET,
        code,
        redirect_uri: `${process.env.NEXT_PUBLIC_API_URL}/api/auth/meta/callback`,
      }),
    })

    const { access_token, expires_in } = await tokenResponse.json()

    // Save to Supabase
    const { error } = await supabase
      .from('platform_connections')
      .insert([{
        brand_id: state,
        platform_type: 'meta',
        access_token,
        expires_at: new Date(Date.now() + (expires_in * 1000)).toISOString(),
        connected_at: new Date().toISOString()
      }])

    if (error) throw error

    return NextResponse.redirect('/settings?success=true')
  } catch (error) {
    console.error('Error in Meta callback:', error)
    return NextResponse.redirect('/settings?error=connection_failed')
  }
} 