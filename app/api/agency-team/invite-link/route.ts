import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { roleId, expiresInDays = 7, maxUses = 1 } = await request.json()

    if (!roleId) {
      return NextResponse.json({ error: 'Role is required' }, { status: 400 })
    }

    const supabase = createClient()

    // Validate role exists and is not owner
    const { data: role, error: roleError } = await supabase
      .from('agency_roles')
      .select('*')
      .eq('id', roleId)
      .single()

    if (roleError || !role) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    if (role.name === 'owner') {
      return NextResponse.json({ error: 'Cannot create invite links for owner role' }, { status: 400 })
    }

    // Generate unique invitation token
    const invitationToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiresInDays)

    // Create invitation link record
    const { data: inviteLink, error: insertError } = await supabase
      .from('agency_invite_links')
      .insert({
        agency_owner_id: userId,
        role_id: roleId,
        token: invitationToken,
        expires_at: expiresAt.toISOString(),
        max_uses: maxUses,
        current_uses: 0,
        is_active: true
      })
      .select(`
        *,
        agency_roles (
          name,
          description,
          permissions
        )
      `)
      .single()

    if (insertError) {
      console.error('Error creating invite link:', insertError)
      return NextResponse.json({ error: 'Failed to create invitation link' }, { status: 500 })
    }

    // Generate the invite URL
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/join-agency/${invitationToken}`

    return NextResponse.json({
      success: true,
      message: 'Invitation link created successfully',
      inviteUrl,
      inviteLink
    })

  } catch (error) {
    console.error('Exception in invite link POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { linkId } = await request.json()

    if (!linkId) {
      return NextResponse.json({ error: 'Link ID is required' }, { status: 400 })
    }

    const supabase = createClient()

    // Revoke the invitation link
    const { data: revokedLink, error: updateError } = await supabase
      .from('agency_invite_links')
      .update({
        is_active: false,
        revoked_at: new Date().toISOString()
      })
      .eq('id', linkId)
      .eq('agency_owner_id', userId) // Ensure user owns this link
      .select('*')
      .single()

    if (updateError) {
      console.error('Error revoking invite link:', updateError)
      return NextResponse.json({ error: 'Failed to revoke invitation link' }, { status: 500 })
    }

    if (!revokedLink) {
      return NextResponse.json({ error: 'Invitation link not found or already revoked' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation link revoked successfully'
    })

  } catch (error) {
    console.error('Exception in invite link DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 