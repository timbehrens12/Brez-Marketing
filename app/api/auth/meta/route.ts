import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  console.log('=== META AUTH START ===')
  console.log('Full request URL:', request.url)
  
  const { searchParams } = new URL(request.url)
  const brandId = searchParams.get('brandId')
  
  console.log('Brand ID:', brandId)
  console.log('Environment variables:', {
    META_APP_ID: !!process.env.META_APP_ID,
    API_URL: process.env.API_URL,
    BACKEND_URL: process.env.BACKEND_URL,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL
  })

  if (!brandId) {
    console.error('Missing brandId')
    return NextResponse.redirect('/settings?error=missing_params')
  }

  if (!process.env.META_APP_ID) {
    console.error('Missing META_APP_ID environment variable')
    return NextResponse.redirect('/settings?error=configuration_error')
  }

  const clientId = process.env.META_APP_ID
  const scopes = 'ads_read,ads_management,business_management,pages_read_engagement'
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/meta/callback`
  const state = brandId

  console.log('Auth configuration:', {
    redirectUri,
    scopes,
    hasClientId: !!clientId
  })

  console.log('FINAL REDIRECT URI:', redirectUri)

  // Build Facebook OAuth URL with additional parameters
  const authUrl = new URL('https://www.facebook.com/v18.0/dialog/oauth')
  authUrl.searchParams.append('client_id', process.env.META_APP_ID)
  authUrl.searchParams.append('redirect_uri', redirectUri)
  authUrl.searchParams.append('state', state)
  authUrl.searchParams.append('scope', 'ads_read,ads_management,business_management,pages_read_engagement')
  authUrl.searchParams.append('response_type', 'code')
  authUrl.searchParams.append('auth_type', 'rerequest')
  authUrl.searchParams.append('display', 'popup')

  console.log('FINAL META AUTH URL:', authUrl.toString())
  
  return NextResponse.redirect(authUrl.toString())
} 