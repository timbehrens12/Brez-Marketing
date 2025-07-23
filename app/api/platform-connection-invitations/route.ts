import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { getSupabaseClient } from '@/lib/supabase/client'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { brandId, platformType, expiresInDays = 7, brandOwnerEmail } = await request.json()

    console.log('🔍 Creating platform connection invitation:', {
      userId,
      brandId,
      platformType,
      expiresInDays,
      brandOwnerEmail
    })

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    if (!platformType || !['shopify', 'meta'].includes(platformType)) {
      return NextResponse.json({ error: 'Valid platform type is required (shopify or meta)' }, { status: 400 })
    }

    const supabase = getSupabaseClient()

    // Verify user can manage platforms for this brand (either owner or has permission)
    const { data: brandOwnership, error: ownershipError } = await supabase
      .from('brands')
      .select('id, name, user_id')
      .eq('id', brandId)
      .eq('user_id', userId)
      .single()

    let canManagePlatforms = !!brandOwnership

    // If not owner, check if user has platform management permission
    if (!canManagePlatforms) {
      const { data: brandAccess, error: accessError } = await supabase
        .from('brand_access')
        .select('can_manage_platforms')
        .eq('brand_id', brandId)
        .eq('user_id', userId)
        .eq('can_manage_platforms', true)
        .is('revoked_at', null)
        .single()

      canManagePlatforms = !!brandAccess
    }

    if (!canManagePlatforms) {
      return NextResponse.json({ error: 'You do not have permission to manage platforms for this brand' }, { status: 403 })
    }

    // Check if platform is already connected
    const { data: existingConnection } = await supabase
      .from('platform_connections')
      .select('id')
      .eq('brand_id', brandId)
      .eq('platform_type', platformType)
      .eq('status', 'active')
      .single()

    if (existingConnection) {
      return NextResponse.json({ error: `${platformType.charAt(0).toUpperCase() + platformType.slice(1)} is already connected to this brand` }, { status: 400 })
    }

    // Check for existing active invitation for this brand/platform combination
    const { data: existingInvitation } = await supabase
      .from('platform_connection_invitations')
      .select('id, token')
      .eq('brand_id', brandId)
      .eq('platform_type', platformType)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (existingInvitation) {
      const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin}/connect-platform/${existingInvitation.token}`
      return NextResponse.json({
        success: true,
        message: 'Active invitation already exists for this platform',
        inviteUrl,
        isExisting: true
      })
    }

    // Generate unique token
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiresInDays)

    // Create the platform connection invitation
    const { data: invitation, error: insertError } = await supabase
      .from('platform_connection_invitations')
      .insert({
        token,
        brand_id: brandId,
        platform_type: platformType,
        created_by: userId,
        brand_owner_email: brandOwnerEmail,
        expires_at: expiresAt.toISOString(),
        max_uses: 1,
        current_uses: 0,
        is_active: true,
        status: 'pending'
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating platform connection invitation:', insertError)
      return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 })
    }

    // Generate the invitation URL
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin}/connect-platform/${token}`

    // Get brand information for response
    const brandInfo = brandOwnership || { name: 'Unknown Brand' }

    console.log('✅ Platform connection invitation created:', {
      token,
      brandId,
      platformType,
      expires_at: expiresAt.toISOString()
    })

    return NextResponse.json({
      success: true,
      message: `Platform connection invitation created for ${brandInfo.name}`,
      inviteUrl,
      invitation,
      platformType,
      brandName: brandInfo.name
    })

  } catch (error) {
    console.error('Error in platform connection invitation API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const brandId = searchParams.get('brandId')

    const supabase = getSupabaseClient()

    let query = supabase
      .from('platform_connection_invitations')
      .select(`
        *,
        brands:brand_id (
          id,
          name
        )
      `)
      .eq('created_by', userId)
      .order('created_at', { ascending: false })

    if (brandId) {
      query = query.eq('brand_id', brandId)
    }

    const { data: invitations, error } = await query

    if (error) {
      console.error('Error fetching platform connection invitations:', error)
      return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      invitations
    })

  } catch (error) {
    console.error('Error in GET platform connection invitations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { invitationId } = await request.json()

    if (!invitationId) {
      return NextResponse.json({ error: 'Invitation ID is required' }, { status: 400 })
    }

    const supabase = getSupabaseClient()

    // Revoke the invitation (set is_active to false)
    const { data: revokedInvitation, error: updateError } = await supabase
      .from('platform_connection_invitations')
      .update({
        is_active: false,
        status: 'revoked'
      })
      .eq('id', invitationId)
      .eq('created_by', userId)
      .select()
      .single()

    if (updateError) {
      console.error('Error revoking platform connection invitation:', updateError)
      return NextResponse.json({ error: 'Failed to revoke invitation' }, { status: 500 })
    }

    if (!revokedInvitation) {
      return NextResponse.json({ error: 'Invitation not found or already revoked' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: 'Platform connection invitation revoked successfully'
    })

  } catch (error) {
    console.error('Error in revoke platform connection invitation API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 