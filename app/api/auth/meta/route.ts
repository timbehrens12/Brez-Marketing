import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const brandId = searchParams.get('brandId')

  // Debug logging
  console.log('Environment variables:', {
    META_APP_ID: process.env.META_APP_ID,
    API_URL: process.env.API_URL,
  })

  if (!process.env.META_APP_ID) {
    console.error('META_APP_ID is not defined')
    return NextResponse.json({ error: 'Meta configuration is missing' }, { status: 500 })
  }

  if (!brandId) {
    return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
  }

  const clientId = process.env.META_APP_ID
  const redirectUri = `${process.env.FRONTEND_URL}/api/auth/meta/callback`
  const scope = 'ads_read,ads_management,business_management,pages_read_engagement'
  
  // Debug logging
  console.log('Auth URL components:', {
    clientId,
    redirectUri,
    scope,
    brandId
  })

  const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
    `client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent(scope)}` +
    `&state=${brandId}`
    
  return NextResponse.redirect(authUrl)
} 