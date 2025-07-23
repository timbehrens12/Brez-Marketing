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
    const shop = searchParams.get('shop')
    const state = searchParams.get('state') // This is our invitation token

    console.log('🔍 Shopify self-service callback:', { shop, code, state })

    if (!code || !shop || !state) {
      console.error('❌ Missing required parameters:', { shop, code, state })
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
    if (invitation.platform_type !== 'shopify') {
      console.error('❌ Platform type mismatch')
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/connect-platform/${state}?error=platform_mismatch`)
    }

    try {
      // Exchange code for access token
      console.log('🔄 Exchanging code for access token')
      const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: process.env.SHOPIFY_CLIENT_ID,
          client_secret: process.env.SHOPIFY_CLIENT_SECRET,
          code,
        }),
      })

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text()
        console.error('❌ Token exchange failed:', errorText)
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/connect-platform/${state}?error=token_exchange_failed`)
      }

      const tokenData = await tokenResponse.json()
      console.log('✅ Got access token')

      // Create platform connection
      const { data: connection, error: connectionError } = await supabaseAdmin
        .from('platform_connections')
        .insert({
          brand_id: invitation.brand_id,
          platform_type: 'shopify',
          shop: shop,
          access_token: tokenData.access_token,
          status: 'active',
          user_id: invitation.created_by, // Associate with the user who created the invitation
          metadata: {
            shop_url: `https://${shop}`,
            connected_via_invitation: true,
            invitation_token: state
          }
        })
        .select()
        .single()

      if (connectionError) {
        console.error('❌ Failed to create platform connection:', connectionError)
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/connect-platform/${state}?error=connection_failed`)
      }

      console.log('✅ Platform connection created:', connection.id)

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

      console.log('✅ Shopify self-service connection completed successfully')

      // Redirect to success page
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/connect-platform/${state}/success`)

    } catch (error) {
      console.error('❌ Error in Shopify self-service callback:', error)
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/connect-platform/${state}?error=connection_error`)
    }

  } catch (error) {
    console.error('❌ Fatal error in Shopify self-service callback:', error)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}?error=callback_error`)
  }
} 