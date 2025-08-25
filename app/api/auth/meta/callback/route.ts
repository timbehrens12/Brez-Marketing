import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs'
import { DataBackfillService } from '@/lib/services/dataBackfillService'

export async function GET(request: NextRequest) {
  console.log('=== META CALLBACK START ===')
  console.log('Full URL:', request.url)
  
  try {
    const { userId } = auth()
    
    if (!userId) {
      console.error('No user ID found in session')
      return NextResponse.redirect('https://www.brezmarketingdashboard.com/settings?error=no_user')
    }

    const url = new URL(request.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const storedState = request.cookies.get('meta_auth_state')?.value
    
    console.log('Auth params:', { 
      code: code ? `${code.substring(0, 10)}...` : null,
      state,
      storedState,
      userId
    })

    if (!code || !state || !storedState || state !== storedState) {
      console.error('Invalid auth params')
      return NextResponse.redirect('https://www.brezmarketingdashboard.com/settings?error=invalid_state')
    }

    // Exchange code for token
    const tokenUrl = new URL('https://graph.facebook.com/v18.0/oauth/access_token')
    tokenUrl.searchParams.append('client_id', process.env.META_APP_ID!)
    tokenUrl.searchParams.append('client_secret', process.env.META_APP_SECRET!)
    tokenUrl.searchParams.append('code', code)
    tokenUrl.searchParams.append('redirect_uri', 'https://www.brezmarketingdashboard.com/api/auth/meta/callback')

    const tokenResponse = await fetch(tokenUrl.toString())
    const tokenData = await tokenResponse.json()

    if (!tokenData.access_token) {
      console.error('No access token in response')
      return NextResponse.redirect('https://www.brezmarketingdashboard.com/settings?error=token_failed')
    }

    // Store in database
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    const { error: dbError } = await supabase
      .from('platform_connections')
      .upsert({
        brand_id: state,
        platform_type: 'meta',
        access_token: tokenData.access_token,
        status: 'active',
        user_id: userId,
        sync_status: 'pending'
      })

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.redirect('https://www.brezmarketingdashboard.com/settings?error=db_error')
    }

    console.log(`[Meta Callback] Connection created successfully, triggering data backfill for brand ${state}`)
    
    // Trigger automatic data backfill in the background
    DataBackfillService.triggerInitialBackfill(state, 'meta', tokenData.access_token)
      .catch(error => {
        console.error('[Meta Callback] Background backfill failed:', error)
      })

    // Clear auth cookie
    const response = NextResponse.redirect('https://www.brezmarketingdashboard.com/settings?success=true&backfill=started')
    response.cookies.delete('meta_auth_state')
    
    return response

  } catch (error) {
    console.error('Callback error:', error)
    return NextResponse.redirect('https://www.brezmarketingdashboard.com/settings?error=server_error')
  }
} 