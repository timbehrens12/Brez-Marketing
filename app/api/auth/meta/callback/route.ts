import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'
import axios from 'axios'

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
    const tokenResponse = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
      params: {
        client_id: process.env.META_APP_ID,
        client_secret: process.env.META_APP_SECRET,
        code: code,
        redirect_uri: `${process.env.API_URL}/meta/callback`
      }
    })

    // Test the token works by making a test API call
    const testResponse = await axios.get('https://graph.facebook.com/v18.0/me/adaccounts', {
      params: {
        access_token: tokenResponse.data.access_token,
        fields: 'account_id,name'
      }
    })

    console.log('Test API call successful:', testResponse.data)

    // Save to Supabase
    const { error } = await supabase
      .from('platform_connections')
      .insert({
        brand_id: state,
        platform_type: 'meta',
        access_token: tokenResponse.data.access_token,
        connected_at: new Date().toISOString()
      })

    if (error) throw error

    return NextResponse.redirect('/settings?success=true')
  } catch (error) {
    console.error('Error in Meta callback:', error)
    return NextResponse.redirect('/settings?error=connection_failed')
  }
} 