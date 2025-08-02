import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

export async function GET(request: NextRequest) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient()

    // Get team members for this agency
    const { data: teamMembers, error: teamError } = await supabase
      .from('agency_team_members')
      .select(`
        *,
        agency_roles (
          name,
          description,
          permissions
        )
      `)
      .eq('agency_owner_id', userId)
      .order('created_at', { ascending: false })

    if (teamError) {
      console.error('Error fetching team members:', teamError)
      return NextResponse.json({ error: 'Failed to fetch team members' }, { status: 500 })
    }

    // Get actual user information for invited_by_user_id fields
    let teamMembersWithUserInfo = teamMembers || []
    if (teamMembers && teamMembers.length > 0) {
      const invitedByUserIds = teamMembers
        .map(member => member.invited_by_user_id)
        .filter(Boolean)
        .filter((id, index, array) => array.indexOf(id) === index) // unique values

      if (invitedByUserIds.length > 0) {
        try {
          const userResponse = await fetch(`${request.nextUrl.origin}/api/users`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userIds: invitedByUserIds })
          })

          if (userResponse.ok) {
            const userData = await userResponse.json()
            if (userData.success) {
              teamMembersWithUserInfo = teamMembers.map(member => ({
                ...member,
                invited_by_name: member.invited_by_user_id 
                  ? (userData.users[member.invited_by_user_id]?.fullName || member.invited_by_name || 'Unknown User')
                  : member.invited_by_name,
                invited_by_email: member.invited_by_user_id 
                  ? (userData.users[member.invited_by_user_id]?.emailAddress || member.invited_by_email)
                  : member.invited_by_email
              }))
            }
          }
        } catch (error) {
          console.error('Error fetching invited_by user info:', error)
        }
      }
    }

    // Get available roles
    const { data: roles, error: rolesError } = await supabase
      .from('agency_roles')
      .select('*')
      .order('name')

    if (rolesError) {
      console.error('Error fetching roles:', rolesError)
      return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 })
    }

    // Get active invitation links
    const { data: inviteLinks, error: linksError } = await supabase
      .from('agency_invite_links')
      .select(`
        *,
        agency_roles (
          name,
          description
        )
      `)
      .eq('agency_owner_id', userId)
      .order('created_at', { ascending: false })

    if (linksError) {
      console.error('Error fetching invite links:', linksError)
    }

    // Transform invite links to include role_name for easier frontend access
    const transformedInviteLinks = (inviteLinks || []).map(link => ({
      ...link,
      role_name: link.agency_roles?.name || 'unknown'
    }))

    return NextResponse.json({
      success: true,
      teamMembers: teamMembersWithUserInfo,
      roles: roles || [],
      inviteLinks: transformedInviteLinks
    })

  } catch (error) {
    console.error('Exception in agency team GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action, email, roleId, memberId } = await request.json()

    const supabase = createClient()

    switch (action) {
      case 'invite':
        return await handleInvite(supabase, userId, email, roleId)
      case 'updateRole':
        return await handleUpdateRole(supabase, userId, memberId, roleId)
      case 'remove':
        return await handleRemoveMember(supabase, userId, memberId)
      case 'resendInvite':
        return await handleResendInvite(supabase, userId, memberId)
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    console.error('Exception in agency team POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function handleInvite(supabase: any, userId: string, email: string, roleId: string) {
  if (!email || !roleId) {
    return NextResponse.json({ error: 'Email and role are required' }, { status: 400 })
  }

  // Check if email is already invited or is the owner
  if (email === await getUserEmail(userId)) {
    return NextResponse.json({ error: 'Cannot invite yourself' }, { status: 400 })
  }

  // Check if already invited
  const { data: existing } = await supabase
    .from('agency_team_members')
    .select('*')
    .eq('agency_owner_id', userId)
    .eq('member_email', email)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'User already invited to this agency' }, { status: 400 })
  }

  // Validate role exists
  const { data: role, error: roleError } = await supabase
    .from('agency_roles')
    .select('*')
    .eq('id', roleId)
    .single()

  if (roleError || !role) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  // Check team size limits
  const { count: teamSize } = await supabase
    .from('agency_team_members')
    .select('*', { count: 'exact' })
    .eq('agency_owner_id', userId)

  if ((teamSize || 0) >= 10) { // Default max team size
    return NextResponse.json({ error: 'Team size limit reached' }, { status: 400 })
  }

  // Generate invitation token
  const invitationToken = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7) // 7 days from now

  // Create team member record
  const { data: newMember, error: insertError } = await supabase
    .from('agency_team_members')
    .insert({
      agency_owner_id: userId,
      member_email: email,
      role_id: roleId,
      invitation_token: invitationToken,
      invitation_expires_at: expiresAt.toISOString(),
      status: 'pending'
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
    console.error('Error creating team member:', insertError)
    return NextResponse.json({ error: 'Failed to send invitation' }, { status: 500 })
  }

  // TODO: Send email invitation (implement email service)
  // await sendInvitationEmail(email, invitationToken, agencyName)

  return NextResponse.json({
    success: true,
    message: 'Invitation sent successfully',
    member: newMember
  })
}

async function handleUpdateRole(supabase: any, userId: string, memberId: string, roleId: string) {
  if (!memberId || !roleId) {
    return NextResponse.json({ error: 'Member ID and role are required' }, { status: 400 })
  }

  // Validate role exists
  const { data: role, error: roleError } = await supabase
    .from('agency_roles')
    .select('*')
    .eq('id', roleId)
    .single()

  if (roleError || !role) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  // Update member role
  const { data: updatedMember, error: updateError } = await supabase
    .from('agency_team_members')
    .update({ role_id: roleId })
    .eq('id', memberId)
    .eq('agency_owner_id', userId)
    .select(`
      *,
      agency_roles (
        name,
        description,
        permissions
      )
    `)
    .single()

  if (updateError) {
    console.error('Error updating member role:', updateError)
    return NextResponse.json({ error: 'Failed to update role' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    message: 'Role updated successfully',
    member: updatedMember
  })
}

async function handleRemoveMember(supabase: any, userId: string, memberId: string) {
  if (!memberId) {
    return NextResponse.json({ error: 'Member ID is required' }, { status: 400 })
  }

  // Delete team member
  const { error: deleteError } = await supabase
    .from('agency_team_members')
    .delete()
    .eq('id', memberId)
    .eq('agency_owner_id', userId)

  if (deleteError) {
    console.error('Error removing team member:', deleteError)
    return NextResponse.json({ error: 'Failed to remove team member' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    message: 'Team member removed successfully'
  })
}

async function handleResendInvite(supabase: any, userId: string, memberId: string) {
  if (!memberId) {
    return NextResponse.json({ error: 'Member ID is required' }, { status: 400 })
  }

  // Generate new invitation token
  const invitationToken = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7) // 7 days from now

  // Update invitation
  const { data: updatedMember, error: updateError } = await supabase
    .from('agency_team_members')
    .update({
      invitation_token: invitationToken,
      invitation_expires_at: expiresAt.toISOString(),
      invited_at: new Date().toISOString()
    })
    .eq('id', memberId)
    .eq('agency_owner_id', userId)
    .eq('status', 'pending')
    .select('*')
    .single()

  if (updateError) {
    console.error('Error resending invitation:', updateError)
    return NextResponse.json({ error: 'Failed to resend invitation' }, { status: 500 })
  }

  // TODO: Send email invitation
  // await sendInvitationEmail(updatedMember.member_email, invitationToken, agencyName)

  return NextResponse.json({
    success: true,
    message: 'Invitation resent successfully'
  })
}

async function getUserEmail(userId: string): Promise<string | null> {
  // This would typically come from Clerk API or be stored in your user table
  // For now, return null as we don't have direct access to Clerk user data in API routes
  return null
} 