import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state') // This is our brandId

  console.log('Meta callback received:', { code, state })

  if (!code || !state) {
    console.error('Missing required params:', { code, state })
    return NextResponse.redirect('/settings?error=missing_params')
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://graph.facebook.com/v18.0/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.META_APP_ID,
        client_secret: process.env.META_APP_SECRET,
        code,
        redirect_uri: `${process.env.NEXT_PUBLIC_API_URL}/api/auth/meta/callback`
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
        platform_type: 'meta',
        access_token: access_token,
        connected_at: new Date().toISOString()
      }])

    if (error) throw error

    // Redirect back to settings with success
    return NextResponse.redirect('/settings?success=true')
  } catch (error) {
    console.error('Error in Meta callback:', error)
    return NextResponse.redirect('/settings?error=connection_failed')
  }
} 