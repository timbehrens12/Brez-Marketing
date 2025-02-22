import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    console.error('Meta auth error:', error)
    return NextResponse.redirect(`${process.env.FRONTEND_URL}/settings?error=meta_auth_failed`)
  }

  if (!code || !state) {
    return NextResponse.redirect(`${process.env.FRONTEND_URL}/settings?error=invalid_callback`)
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://graph.facebook.com/v18.0/oauth/access_token?' +
      `client_id=${process.env.META_APP_ID}&` +
      `client_secret=${process.env.META_APP_SECRET}&` +
      `code=${code}&` +
      `redirect_uri=${encodeURIComponent(`${process.env.API_URL}/api/auth/meta/callback`)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    })

    const tokenData = await tokenResponse.json()

    if (!tokenResponse.ok) {
      throw new Error(tokenData.error?.message || 'Failed to get access token')
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

    if (dbError) throw dbError

    return NextResponse.redirect(`${process.env.FRONTEND_URL}/settings?success=meta_connected`)
  } catch (error) {
    console.error('Error in Meta callback:', error)
    return NextResponse.redirect(`${process.env.FRONTEND_URL}/settings?error=meta_connection_failed`)
  }
} 