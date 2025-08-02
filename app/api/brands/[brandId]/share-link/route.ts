import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getSupabaseClient } from '@/lib/supabase/client'
import { randomUUID } from 'crypto'

export async function POST(
  request: NextRequest,
  { params }: { params: { brandId: string } }
) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { brandId } = params
    const { role, expiresInDays = 7, maxUses = 1, canManagePlatforms = false, canGenerateReports = true } = await request.json()

    // Validate role
    if (!['admin', 'media_buyer', 'viewer'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    const supabase = getSupabaseClient()

    // Check if user owns this brand or has admin access
    const { data: brandCheck, error: brandError } = await supabase
      .from('brands')
      .select('user_id')
      .eq('id', brandId)
      .single()

    if (brandError || !brandCheck) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
    }

    // Check if user owns the brand
    const isOwner = brandCheck.user_id === userId

    // If not owner, check if user has admin access
    let hasAdminAccess = false
    if (!isOwner) {
      const { data: accessCheck } = await supabase
        .from('brand_access')
        .select('role')
        .eq('brand_id', brandId)
        .eq('user_id', userId)
        .eq('role', 'admin')
        .is('revoked_at', null)
        .single()

      hasAdminAccess = !!accessCheck
    }

    if (!isOwner && !hasAdminAccess) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Generate unique token
    const token = randomUUID()

    // Calculate expiration date
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiresInDays)

    // Create share link
    const { data, error } = await supabase
      .from('brand_share_links')
      .insert({
        brand_id: brandId,
        created_by: userId,
        token,
        role,
        expires_at: expiresAt.toISOString(),
        max_uses: maxUses,
        current_uses: 0,
        is_active: true,
        can_manage_platforms: canManagePlatforms
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating share link:', error)
      return NextResponse.json({ error: 'Failed to create share link' }, { status: 500 })
    }

    // Return the share link
    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/join/${token}`

    return NextResponse.json({
      shareUrl,
      token,
      role,
      expiresAt: expiresAt.toISOString(),
      maxUses
    })

  } catch (error) {
    console.error('Error in share-link API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET endpoint to list existing share links for a brand
export async function GET(
  request: NextRequest,
  { params }: { params: { brandId: string } }
) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { brandId } = params
    const supabase = getSupabaseClient()

    // Check if user owns this brand or has admin access
    const { data: brandCheck, error: brandError } = await supabase
      .from('brands')
      .select('user_id')
      .eq('id', brandId)
      .single()

    if (brandError || !brandCheck) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
    }

    const isOwner = brandCheck.user_id === userId

    let hasAdminAccess = false
    if (!isOwner) {
      const { data: accessCheck } = await supabase
        .from('brand_access')
        .select('role')
        .eq('brand_id', brandId)
        .eq('user_id', userId)
        .eq('role', 'admin')
        .is('revoked_at', null)
        .single()

      hasAdminAccess = !!accessCheck
    }

    if (!isOwner && !hasAdminAccess) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get all active share links for this brand
    const { data: shareLinks, error } = await supabase
      .from('brand_share_links')
      .select('*')
      .eq('brand_id', brandId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching share links:', error)
      return NextResponse.json({ error: 'Failed to fetch share links' }, { status: 500 })
    }

    return NextResponse.json({ shareLinks })

  } catch (error) {
    console.error('Error in share-link GET API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE endpoint to revoke a share link
export async function DELETE(
  request: NextRequest,
  { params }: { params: { brandId: string } }
) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { brandId } = params
    const { token } = await request.json()

    const supabase = getSupabaseClient()

    // Check permissions and deactivate the link
    const { data, error } = await supabase
      .from('brand_share_links')
      .update({ is_active: false })
      .eq('brand_id', brandId)
      .eq('token', token)
      .eq('created_by', userId)
      .select()
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Share link not found or unauthorized' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Share link revoked successfully' })

  } catch (error) {
    console.error('Error in share-link DELETE API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 