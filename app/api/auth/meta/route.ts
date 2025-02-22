import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  console.log('=== META AUTH START ===')
  console.log('Full request URL:', request.url)
  
  const { searchParams } = new URL(request.url)
  const brandId = searchParams.get('brandId')
  
  console.log('Brand ID:', brandId)

  if (!brandId) {
    console.error('Missing brandId')
    return NextResponse.redirect('/settings?error=missing_params')
  }

  const clientId = process.env.META_APP_ID
  const scopes = 'ads_read,ads_management,business_management,pages_read_engagement'
  const redirectUri = `${process.env.API_URL}/api/meta/callback`

  console.log('Auth configuration:', {
    redirectUri,
    scopes,
    hasClientId: !!clientId
  })

  const metaAuthUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
    `client_id=${clientId}&` +
    `scope=${scopes}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `state=${brandId}`

  console.log('Redirecting to:', metaAuthUrl)
  
  return NextResponse.redirect(metaAuthUrl)
} 