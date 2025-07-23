import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase/client'
import { createClient } from '@supabase/supabase-js'

// Create admin client for server-side operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state') // This is our invitation token
    const error = searchParams.get('error')

    console.log('🔍 Meta self-service callback:', { code, state, error })

    if (error) {
      console.error('❌ Meta OAuth error:', error)
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/connect-platform/${state}?error=oauth_error`)
    }

    if (!code || !state) {
      console.error('❌ Missing required parameters:', { code, state })
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/connect-platform/${state}?error=missing_params`)
    }

    // Get the invitation details
    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from('platform_connection_invitations')
      .select('*')
      .eq('token', state)
      .eq('is_active', true)
      .single()

    if (invitationError || !invitation) {
      console.error('❌ Invalid invitation token:', invitationError)
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/connect-platform/${state}?error=invalid_invitation`)
    }

    // Check if invitation is expired
    if (new Date(invitation.expires_at) < new Date()) {
      console.error('❌ Invitation expired')
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/connect-platform/${state}?error=invitation_expired`)
    }

    // Verify platform type matches
    if (invitation.platform_type !== 'meta') {
      console.error('❌ Platform type mismatch')
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/connect-platform/${state}?error=platform_mismatch`)
    }

    try {
      // Exchange code for access token
      console.log('🔄 Exchanging code for Meta access token')
      const tokenUrl = new URL('https://graph.facebook.com/v18.0/oauth/access_token')
      tokenUrl.searchParams.append('client_id', process.env.META_APP_ID!)
      tokenUrl.searchParams.append('client_secret', process.env.META_APP_SECRET!)
      tokenUrl.searchParams.append('code', code)
      tokenUrl.searchParams.append('redirect_uri', `${process.env.NEXT_PUBLIC_APP_URL}/api/platform-connection/meta/callback`)

      const tokenResponse = await fetch(tokenUrl.toString())
      const tokenData = await tokenResponse.json()

      if (!tokenData.access_token) {
        console.error('❌ Meta token exchange failed:', tokenData)
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/connect-platform/${state}?error=token_exchange_failed`)
      }

      console.log('✅ Got Meta access token')

      // Create platform connection
      const { data: connection, error: connectionError } = await supabaseAdmin
        .from('platform_connections')
        .insert({
          brand_id: invitation.brand_id,
          platform_type: 'meta',
          access_token: tokenData.access_token,
          status: 'active',
          user_id: invitation.created_by, // Associate with the user who created the invitation
          metadata: {
            connected_via_invitation: true,
            invitation_token: state,
            token_type: tokenData.token_type || 'bearer'
          }
        })
        .select()
        .single()

      if (connectionError) {
        console.error('❌ Failed to create Meta platform connection:', connectionError)
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/connect-platform/${state}?error=connection_failed`)
      }

      console.log('✅ Meta platform connection created:', connection.id)

      // Mark invitation as completed
      const { error: updateError } = await supabaseAdmin
        .from('platform_connection_invitations')
        .update({
          status: 'completed',
          current_uses: invitation.current_uses + 1,
          completed_at: new Date().toISOString(),
          is_active: false // Deactivate single-use invitation
        })
        .eq('id', invitation.id)

      if (updateError) {
        console.error('❌ Failed to update invitation status:', updateError)
        // Don't fail the connection for this, just log it
      }

      console.log('✅ Meta self-service connection completed successfully')

      // Redirect to success page
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/connect-platform/${state}/success`)

    } catch (error) {
      console.error('❌ Error in Meta self-service callback:', error)
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/connect-platform/${state}?error=connection_error`)
    }

  } catch (error) {
    console.error('❌ Fatal error in Meta self-service callback:', error)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}?error=callback_error`)
  }
} 