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

  const redirectUri = `https://api.brezmarketingdashboard.com/meta/callback`
  
  // Build Facebook OAuth URL with forced fresh login parameters
  const authUrl = new URL('https://www.facebook.com/v18.0/dialog/oauth')
  
  // Add all required parameters
  const params = {
    client_id: process.env.META_APP_ID,
    redirect_uri: redirectUri,
    state: brandId,
    scope: 'ads_read,ads_management,business_management,pages_read_engagement',
    response_type: 'code',
    auth_type: 'reauthenticate',  // Force fresh login
    display: 'popup',
    // Additional parameters to force fresh login
    auth_nonce: Date.now().toString(),
    enable_granular_permissions: 'true',
    ret: 'login',
    fbapp_pres: '0',
    cbt: Date.now().toString(),
    locale: 'en_US',
    logger_id: Date.now().toString()
  }

  // Add all parameters to URL
  Object.entries(params).forEach(([key, value]) => {
    authUrl.searchParams.append(key, value.toString())
  })

  console.log('FINAL META AUTH URL:', authUrl.toString())
  
  return NextResponse.redirect(authUrl.toString())
} 