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

  if (!brandId || !process.env.META_APP_ID) {
    console.error('Missing brandId or META_APP_ID environment variable')
    return NextResponse.redirect('/settings?error=configuration_error')
  }

  // First, redirect to Facebook's permissions removal page
  const revokeUrl = new URL('https://www.facebook.com/v18.0/dialog/oauth')
  revokeUrl.searchParams.append('client_id', process.env.META_APP_ID)
  revokeUrl.searchParams.append('redirect_uri', 'https://www.facebook.com/connect/login_success.html')
  revokeUrl.searchParams.append('response_type', 'token')
  revokeUrl.searchParams.append('auth_type', 'rerequest')
  revokeUrl.searchParams.append('scope', '')  // Empty scope to remove permissions
  revokeUrl.searchParams.append('display', 'popup')
  revokeUrl.searchParams.append('next', encodeURIComponent(
    `https://www.facebook.com/dialog/oauth?` +
    `client_id=${process.env.META_APP_ID}&` +
    `redirect_uri=${encodeURIComponent('https://api.brezmarketingdashboard.com/meta/callback')}&` +
    `state=${brandId}&` +
    `scope=ads_read,ads_management,business_management,pages_read_engagement&` +
    `response_type=code&` +
    `auth_type=reauthenticate&` +
    `auth_nonce=${Date.now()}&` +
    `ret=login&` +
    `fbapp_pres=0&` +
    `logger_id=${Date.now()}`
  ))

  return NextResponse.redirect(revokeUrl.toString())
} 