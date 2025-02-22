import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const brandId = searchParams.get('brandId')

  if (!brandId) {
    return NextResponse.redirect('/settings?error=missing_params')
  }

  const clientId = process.env.META_CLIENT_ID
  const redirectUri = `${process.env.NEXT_PUBLIC_API_URL}/api/auth/meta/callback`
  const scope = 'ads_read,ads_management,business_management'

  const metaAuthUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `scope=${scope}&` +
    `state=${brandId}`

  return NextResponse.redirect(metaAuthUrl)
} 