import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const brandId = searchParams.get('brandId')

  if (!brandId) {
    return NextResponse.redirect('/settings?error=missing_params')
  }

  const clientId = process.env.META_APP_ID
  const scopes = 'ads_read,ads_management,business_management,pages_read_engagement'
  const redirectUri = `${process.env.NEXT_PUBLIC_API_URL}/api/auth/meta/callback`

  const metaAuthUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
    `client_id=${clientId}&` +
    `scope=${scopes}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `state=${brandId}`

  return NextResponse.redirect(metaAuthUrl)
} 