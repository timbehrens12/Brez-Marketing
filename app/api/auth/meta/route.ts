import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const brandId = searchParams.get('brandId')

  if (!brandId) {
    return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
  }

  // Meta OAuth configuration using your env variable names
  const clientId = process.env.META_APP_ID
  const redirectUri = `${process.env.API_URL}/api/auth/meta/callback`
  const scope = 'ads_read,ads_management,business_management,pages_read_engagement'
  
  // Construct Meta OAuth URL
  const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
    `client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent(scope)}` +
    `&state=${brandId}`
    
  return NextResponse.redirect(authUrl)
} 