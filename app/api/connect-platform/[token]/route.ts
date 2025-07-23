import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase/client'

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params
    
    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    console.log('🔍 Loading platform connection invitation:', { token })

    const supabase = getSupabaseClient()

    // Get the invitation with brand details
    const { data: invitation, error: invitationError } = await supabase
      .from('platform_connection_invitations')
      .select(`
        *,
        brands:brand_id (
          id,
          name,
          image_url,
          niche
        )
      `)
      .eq('token', token)
      .eq('is_active', true)
      .single()

    if (invitationError || !invitation) {
      console.error('Error loading invitation:', invitationError)
      return NextResponse.json({ error: 'Invalid or expired invitation' }, { status: 404 })
    }

    // Check if invitation is expired
    const expiresAt = new Date(invitation.expires_at)
    const now = new Date()
    
    if (expiresAt < now) {
      console.log('❌ Invitation expired:', {
        token,
        expires_at: invitation.expires_at,
        current_time: now.toISOString()
      })
      return NextResponse.json({ error: 'This invitation has expired' }, { status: 400 })
    }

    // Check if max uses reached
    if (invitation.current_uses >= invitation.max_uses) {
      console.log('❌ Invitation max uses reached:', {
        token,
        current_uses: invitation.current_uses,
        max_uses: invitation.max_uses
      })
      return NextResponse.json({ error: 'This invitation has reached its maximum uses' }, { status: 400 })
    }

    // Check if platform is already connected
    const { data: existingConnection } = await supabase
      .from('platform_connections')
      .select('id')
      .eq('brand_id', invitation.brand_id)
      .eq('platform_type', invitation.platform_type)
      .eq('status', 'active')
      .single()

    if (existingConnection) {
      console.log('❌ Platform already connected:', {
        token,
        brand_id: invitation.brand_id,
        platform_type: invitation.platform_type
      })
      return NextResponse.json({ 
        error: `${invitation.platform_type.charAt(0).toUpperCase() + invitation.platform_type.slice(1)} is already connected to this brand` 
      }, { status: 400 })
    }

    console.log('✅ Invitation loaded successfully:', {
      token,
      brand_id: invitation.brand_id,
      platform_type: invitation.platform_type,
      brand_name: invitation.brands?.name
    })

    return NextResponse.json({
      success: true,
      invitation
    })

  } catch (error) {
    console.error('Error in platform connection invitation lookup:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 