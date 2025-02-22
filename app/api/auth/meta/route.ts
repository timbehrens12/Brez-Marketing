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

  const clientId = process.env.META_APP_ID
  const scopes = 'ads_read,ads_management,business_management,pages_read_engagement'
  const redirectUri = `${process.env.API_URL}/meta/callback`

  console.log('Auth configuration:', {
    redirectUri,
    scopes,
    hasClientId: !!clientId
  })

  console.log('FINAL REDIRECT URI:', redirectUri)

  const metaAuthUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
    `client_id=${process.env.META_APP_ID}&` +
    `scope=ads_read,ads_management,business_management,pages_read_engagement&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `state=${brandId}`

  console.log('FINAL META AUTH URL:', metaAuthUrl)
  
  return NextResponse.redirect(metaAuthUrl)
} 