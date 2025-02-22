import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state') // brandId

  console.log('Meta callback received:', { code: code?.substring(0, 10) + '...', state })

  if (!code || !state) {
    console.error('Missing required params:', { code: !!code, state: !!state })
    return NextResponse.redirect('/settings?error=missing_params')
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://graph.facebook.com/v18.0/oauth/access_token', {
      method: 'GET',  // Meta uses GET, not POST
      headers: {
        'Content-Type': 'application/json',
      },
    }).then(res => res.json())

    if (!tokenResponse.access_token) {
      throw new Error('Failed to get access token')
    }

    // Save the connection to Supabase (just like Shopify)
    const { error } = await supabase
      .from('platform_connections')
      .insert([{
        brand_id: state,
        platform_type: 'meta',
        access_token: tokenResponse.access_token,
        connected_at: new Date().toISOString()
      }])

    if (error) throw error

    // Redirect back to settings with success (same as Shopify)
    return NextResponse.redirect('/settings?success=true')
  } catch (error) {
    console.error('Error in Meta callback:', error)
    return NextResponse.redirect('/settings?error=connection_failed')
  }
} 