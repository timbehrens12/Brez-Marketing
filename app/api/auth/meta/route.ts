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
  const redirectUri = `https://api.brezmarketingdashboard.com/meta/callback`
  const state = brandId

  console.log('Auth configuration:', {
    redirectUri,
    scopes,
    hasClientId: !!clientId
  })

  console.log('FINAL REDIRECT URI:', redirectUri)

  // First redirect to Facebook logout
  const logoutRedirectUri = encodeURIComponent(
    `https://brezmarketingdashboard.com/api/auth/meta/fresh-login?brandId=${brandId}`
  )
  
  const logoutUrl = `https://www.facebook.com/logout.php?next=${logoutRedirectUri}&access_token=`
  
  return NextResponse.redirect(logoutUrl)
} 