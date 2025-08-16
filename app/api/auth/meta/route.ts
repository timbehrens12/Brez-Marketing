import { NextRequest, NextResponse } from 'next/server'

// Remove edge runtime if it exists
// export const runtime = 'edge'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await import('@clerk/nextjs').then(m => m.auth())
    
    if (!userId) {
      console.error('No user ID found in auth route')
      return NextResponse.redirect('https://www.brezmarketingdashboard.com/settings?error=no_user_auth')
    }
    
    const url = new URL(request.url)
    const brandId = url.searchParams.get('brandId')
    
    if (!brandId) {
      console.error('Missing brandId parameter')
      return NextResponse.redirect('https://www.brezmarketingdashboard.com/settings?error=missing_brand_id')
    }

    const authUrl = new URL('https://www.facebook.com/v18.0/dialog/oauth')
    authUrl.searchParams.append('client_id', process.env.META_APP_ID!)
    authUrl.searchParams.append('redirect_uri', 'https://www.brezmarketingdashboard.com/api/auth/meta/callback')
    authUrl.searchParams.append('state', brandId)
    authUrl.searchParams.append('response_type', 'code')
    authUrl.searchParams.append('config_id', process.env.META_CONFIG_ID!)

    console.log('Starting Meta auth flow:', { brandId, stateSet: brandId })
    console.log('Auth URL:', authUrl.toString())
    
    // Create response with proper redirect and set state cookie with user info
    const response = NextResponse.redirect(authUrl.toString())
    const stateData = JSON.stringify({ brandId, userId })
    response.cookies.set('meta_auth_state', stateData, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 600 // 10 minutes
    })
    
    return response

  } catch (error) {
    console.error('Auth error:', error)
    return NextResponse.redirect('https://www.brezmarketingdashboard.com/settings?error=auth_failed')
  }
} 