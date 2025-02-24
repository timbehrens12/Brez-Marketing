import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const brandId = searchParams.get('brandId')
  
  if (!brandId || !process.env.META_APP_ID) {
    return NextResponse.redirect('/settings?error=configuration_error')
  }

  const redirectUri = `https://api.brezmarketingdashboard.com/meta/callback`
  
  const authUrl = new URL('https://www.facebook.com/v18.0/dialog/oauth')
  authUrl.searchParams.append('client_id', process.env.META_APP_ID)
  authUrl.searchParams.append('redirect_uri', redirectUri)
  authUrl.searchParams.append('state', brandId)
  authUrl.searchParams.append('scope', 'ads_read,ads_management,business_management,pages_read_engagement')
  authUrl.searchParams.append('response_type', 'code')
  authUrl.searchParams.append('auth_type', 'reauthenticate')
  authUrl.searchParams.append('auth_nonce', Date.now().toString())
  authUrl.searchParams.append('display', 'popup')

  // Additional parameters to force fresh login
  authUrl.searchParams.append('sdk', 'joey')
  authUrl.searchParams.append('seen_revocable_access_grant', 'false')
  authUrl.searchParams.append('should_popup_login_dialog', 'true')
  
  // Force cache busting
  authUrl.searchParams.append('_fb_noscript', '1')
  authUrl.searchParams.append('_rdr', Date.now().toString())

  return NextResponse.redirect(authUrl.toString())
} 