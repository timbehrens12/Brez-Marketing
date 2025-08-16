import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs'
import { DataBackfillService } from '@/lib/services/dataBackfillService'

export async function GET(request: NextRequest) {
  console.log('=== META CALLBACK START ===')
  console.log('Full URL:', request.url)
  
  try {
    const url = new URL(request.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const storedStateRaw = request.cookies.get('meta_auth_state')?.value
    const errorParam = url.searchParams.get('error')
    
    // Parse stored state data
    let storedState, userId
    try {
      const stateData = JSON.parse(storedStateRaw || '{}')
      storedState = stateData.brandId
      userId = stateData.userId
    } catch (e) {
      // Fallback for old format (just brandId string)
      storedState = storedStateRaw
      // Try to get userId from current session as fallback
      const { userId: sessionUserId } = auth()
      userId = sessionUserId
    }
    
    if (!userId) {
      console.error('No user ID found in session or stored state')
      return NextResponse.redirect('https://www.brezmarketingdashboard.com/settings?error=no_user')
    }
    
    console.log('=== META CALLBACK AUTH VALIDATION ===')
    console.log('Auth params:', { 
      code: code ? `${code.substring(0, 10)}...` : null,
      state,
      storedState,
      userId,
      error: errorParam,
      hasCode: !!code,
      hasState: !!state,
      hasStoredState: !!storedState,
      statesMatch: state === storedState
    })

    // Check for OAuth errors first
    if (errorParam) {
      console.error('OAuth error from Meta:', errorParam)
      return NextResponse.redirect(`https://www.brezmarketingdashboard.com/settings?error=oauth_${errorParam}`)
    }

    if (!code) {
      console.error('Missing authorization code')
      return NextResponse.redirect('https://www.brezmarketingdashboard.com/settings?error=missing_code')
    }

    if (!state) {
      console.error('Missing state parameter')
      return NextResponse.redirect('https://www.brezmarketingdashboard.com/settings?error=missing_state')
    }

    if (!storedState) {
      console.error('Missing stored state cookie')
      return NextResponse.redirect('https://www.brezmarketingdashboard.com/settings?error=missing_stored_state')
    }

    if (state !== storedState) {
      console.error('State mismatch:', { received: state, stored: storedState })
      return NextResponse.redirect('https://www.brezmarketingdashboard.com/settings?error=state_mismatch')
    }

    console.log('✅ Auth validation passed')

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
    try {
      console.log(`[Meta Callback] Starting background backfill for brand ${state} with token ending in ...${tokenData.access_token.slice(-10)}`)
      DataBackfillService.triggerInitialBackfill(state, 'meta', tokenData.access_token)
        .then(() => {
          console.log(`[Meta Callback] Background backfill completed successfully for brand ${state}`)
        })
        .catch(error => {
          console.error('[Meta Callback] Background backfill failed:', error)
        })
    } catch (syncError) {
      console.error('[Meta Callback] Error triggering backfill:', syncError)
    }

    // Clear auth cookie and redirect to syncing page
    const response = NextResponse.redirect(`https://www.brezmarketingdashboard.com/settings/meta-syncing?brandId=${state}`)
    response.cookies.delete('meta_auth_state')
    
    return response

  } catch (error) {
    console.error('Callback error:', error)
    return NextResponse.redirect('https://www.brezmarketingdashboard.com/settings?error=server_error')
  }
} 