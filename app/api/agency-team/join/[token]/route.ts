import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const supabase = createClient()
    const { token } = params

    if (!token) {
      return NextResponse.json({ error: 'Invalid invitation token' }, { status: 400 })
    }

    // Get invitation link details
    const { data: inviteLink, error: linkError } = await supabase
      .from('agency_invite_links')
      .select(`
        *,
        agency_roles (
          name,
          description,
          permissions
        )
      `)
      .eq('token', token)
      .eq('is_active', true)
      .single()

    if (linkError || !inviteLink) {
      return NextResponse.json({ error: 'Invalid or expired invitation' }, { status: 404 })
    }

    // Check if invitation has expired
    const now = new Date()
    const expiresAt = new Date(inviteLink.expires_at)
    
    if (now > expiresAt) {
      return NextResponse.json({ error: 'Invitation has expired' }, { status: 410 })
    }

    // Check if max uses reached
    if (inviteLink.current_uses >= inviteLink.max_uses) {
      return NextResponse.json({ error: 'This invitation has reached its maximum uses' }, { status: 410 })
    }

    // Get agency owner details for display
    const { data: ownerSettings, error: ownerError } = await supabase
      .from('agency_settings')
      .select('agency_name, agency_logo_url')
      .eq('user_id', inviteLink.agency_owner_id)
      .single()

    return NextResponse.json({
      success: true,
      invitation: {
        role: inviteLink.agency_roles,
        agencyName: ownerSettings?.agency_name || 'Unknown Agency',
        agencyLogo: ownerSettings?.agency_logo_url,
        invitedAt: inviteLink.created_at,
        expiresAt: inviteLink.expires_at
      }
    })

  } catch (error) {
    console.error('Exception in invitation GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Must be signed in to accept invitation' }, { status: 401 })
    }

    const supabase = createClient()
    const { token } = params

    if (!token) {
      return NextResponse.json({ error: 'Invalid invitation token' }, { status: 400 })
    }

    // Get invitation link details
    const { data: inviteLink, error: linkError } = await supabase
      .from('agency_invite_links')
      .select('*')
      .eq('token', token)
      .eq('is_active', true)
      .single()

    if (linkError || !inviteLink) {
      return NextResponse.json({ error: 'Invalid or expired invitation' }, { status: 404 })
    }

    // Check if invitation has expired
    const now = new Date()
    const expiresAt = new Date(inviteLink.expires_at)
    
    if (now > expiresAt) {
      return NextResponse.json({ error: 'Invitation has expired' }, { status: 410 })
    }

    // Check if max uses reached
    if (inviteLink.current_uses >= inviteLink.max_uses) {
      return NextResponse.json({ error: 'This invitation has reached its maximum uses' }, { status: 410 })
    }

    // Check if user is already a team member of this agency
    const { data: existingMember } = await supabase
      .from('agency_team_members')
      .select('*')
      .eq('agency_owner_id', inviteLink.agency_owner_id)
      .eq('member_user_id', userId)
      .eq('status', 'active')
      .single()

    if (existingMember) {
      return NextResponse.json({ error: 'You are already a member of this agency' }, { status: 400 })
    }

    // Get user's email from Clerk or other source
    // For now, we'll use a placeholder since we don't have email in the link
    const userEmail = `user-${userId}@placeholder.com` // You might want to get this from Clerk

    // Get the agency owner's user information for invited_by details
    let agencyOwnerUserInfo = null
    try {
      const userResponse = await fetch(`${request.nextUrl.origin}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userIds: [inviteLink.agency_owner_id] })
      })

      if (userResponse.ok) {
        const userData = await userResponse.json()
        if (userData.success) {
          agencyOwnerUserInfo = userData.users[inviteLink.agency_owner_id] || null
        }
      }
    } catch (error) {
      console.error('Error fetching agency owner user info:', error)
    }

    // Create new team member record
    const { data: newMember, error: insertError } = await supabase
      .from('agency_team_members')
      .insert({
        agency_owner_id: inviteLink.agency_owner_id,
        member_user_id: userId,
        member_email: userEmail,
        role_id: inviteLink.role_id,
        status: 'active',
        joined_at: new Date().toISOString(),
        invited_by_user_id: inviteLink.agency_owner_id,
        invited_by_name: agencyOwnerUserInfo?.fullName || 'Agency Owner',
        invited_by_email: agencyOwnerUserInfo?.emailAddress || `owner-${inviteLink.agency_owner_id}@agency.com`
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
      return NextResponse.json({ error: 'Failed to join agency' }, { status: 500 })
    }

    // Update invitation link usage count
    const { error: updateError } = await supabase
      .from('agency_invite_links')
      .update({
        current_uses: inviteLink.current_uses + 1
      })
      .eq('id', inviteLink.id)

    if (updateError) {
      console.error('Error updating invite link usage:', updateError)
      // Don't fail the request if we can't update usage count
    }

    // If max uses reached, deactivate the link
    if (inviteLink.current_uses + 1 >= inviteLink.max_uses) {
      await supabase
        .from('agency_invite_links')
        .update({ is_active: false })
        .eq('id', inviteLink.id)
    }

    // Get agency details
    const { data: agencySettings } = await supabase
      .from('agency_settings')
      .select('agency_name, agency_logo_url')
      .eq('user_id', inviteLink.agency_owner_id)
      .single()

    return NextResponse.json({
      success: true,
      message: `Welcome to ${agencySettings?.agency_name || 'the agency'}!`,
      member: newMember,
      agencyName: agencySettings?.agency_name
    })

  } catch (error) {
    console.error('Exception in invitation POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 