import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getSupabaseClient } from '@/lib/supabase/client'

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params
    const supabase = getSupabaseClient()

    // Get share link data with brand information
    const { data: shareLink, error } = await supabase
      .from('brand_share_links')
      .select(`
        *,
        brands (
          id,
          name,
          image_url,
          niche
        )
      `)
      .eq('token', token)
      .eq('is_active', true)
      .single()

    if (error || !shareLink) {
      return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 })
    }

    // Check if link is expired
    const expiresAt = new Date(shareLink.expires_at)
    if (expiresAt < new Date()) {
      return NextResponse.json({ error: 'This invitation has expired' }, { status: 400 })
    }

    // Check if max uses reached
    if (shareLink.current_uses >= shareLink.max_uses) {
      return NextResponse.json({ error: 'This invitation has reached its maximum uses' }, { status: 400 })
    }

    // Return share link data (without sensitive info)
    return NextResponse.json({
      id: shareLink.id,
      brand_id: shareLink.brand_id,
      role: shareLink.role,
      expires_at: shareLink.expires_at,
      max_uses: shareLink.max_uses,
      current_uses: shareLink.current_uses,
      created_at: shareLink.created_at,
      brand: shareLink.brands
    })

  } catch (error) {
    console.error('Error in join GET API:', error)
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { token } = params
    const supabase = getSupabaseClient()

    // Get share link data
    const { data: shareLink, error: linkError } = await supabase
      .from('brand_share_links')
      .select('*')
      .eq('token', token)
      .eq('is_active', true)
      .single()

    if (linkError || !shareLink) {
      return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 })
    }

    // Check if link is expired
    const expiresAt = new Date(shareLink.expires_at)
    if (expiresAt < new Date()) {
      return NextResponse.json({ error: 'This invitation has expired' }, { status: 400 })
    }

    // Check if max uses reached
    if (shareLink.current_uses >= shareLink.max_uses) {
      return NextResponse.json({ error: 'This invitation has reached its maximum uses' }, { status: 400 })
    }

    // Check if user already has access to this brand (active access)
    const { data: activeAccess, error: accessCheckError } = await supabase
      .from('brand_access')
      .select('id, role, can_manage_platforms')
      .eq('brand_id', shareLink.brand_id)
      .eq('user_id', userId)
      .is('revoked_at', null)
      .maybeSingle()

    if (activeAccess) {
      return NextResponse.json({ 
        error: 'You already have access to this brand',
        details: {
          current_role: activeAccess.role,
          can_manage_platforms: activeAccess.can_manage_platforms
        }
      }, { status: 400 })
    }

    // Check if user has any previous access (including revoked) due to unique constraint
    const { data: anyAccess, error: anyAccessError } = await supabase
      .from('brand_access')
      .select('id, revoked_at')
      .eq('brand_id', shareLink.brand_id)
      .eq('user_id', userId)
      .maybeSingle()

    const hasRevokedAccess = anyAccess && anyAccess.revoked_at !== null

    // Check if user owns this brand
    const { data: brandOwner } = await supabase
      .from('brands')
      .select('user_id')
      .eq('id', shareLink.brand_id)
      .single()

    if (brandOwner?.user_id === userId) {
      return NextResponse.json({ error: 'You already own this brand' }, { status: 400 })
    }

    // Start transaction-like operations
    try {
      let accessError = null

      if (hasRevokedAccess) {
        // Update the existing revoked record to restore access
        const { error } = await supabase
          .from('brand_access')
          .update({
            role: shareLink.role,
            granted_by: shareLink.created_by,
            granted_at: new Date().toISOString(),
            revoked_at: null, // Restore access
            can_manage_platforms: shareLink.can_manage_platforms || false
          })
          .eq('id', anyAccess.id)
        
        accessError = error
      } else {
        // Insert new access record
        const { error } = await supabase
          .from('brand_access')
          .insert({
            brand_id: shareLink.brand_id,
            user_id: userId,
            role: shareLink.role,
            granted_by: shareLink.created_by,
            granted_at: new Date().toISOString(),
            can_manage_platforms: shareLink.can_manage_platforms || false
          })
        
        accessError = error
      }

      if (accessError) {
        // Handle duplicate key constraint error gracefully
        if (accessError.code === '23505' && accessError.message?.includes('brand_access_brand_id_user_id_key')) {
          return NextResponse.json({ 
            error: 'You already have access to this brand',
            details: 'This user already has access to the brand'
          }, { status: 400 })
        }
        throw accessError
      }

      // Update share link usage count
      const { error: updateError } = await supabase
        .from('brand_share_links')
        .update({
          current_uses: shareLink.current_uses + 1
        })
        .eq('id', shareLink.id)

      if (updateError) {
        console.error('Error updating share link usage:', updateError)
        // Don't fail the request if we can't update usage count
      }

      // If max uses reached, deactivate the link
      if (shareLink.current_uses + 1 >= shareLink.max_uses) {
        await supabase
          .from('brand_share_links')
          .update({ is_active: false })
          .eq('id', shareLink.id)
      }

      return NextResponse.json({ 
        message: hasRevokedAccess ? 'Successfully restored brand access' : 'Successfully joined brand',
        brandId: shareLink.brand_id,
        role: shareLink.role,
        can_manage_platforms: shareLink.can_manage_platforms || false,
        access_type: hasRevokedAccess ? 'restored' : 'new'
      })

    } catch (error: any) {
      console.error('Error granting brand access:', error)
      
      // Handle duplicate key constraint error as a final fallback
      if (error?.code === '23505' && error?.message?.includes('brand_access_brand_id_user_id_key')) {
        return NextResponse.json({ 
          error: 'You already have access to this brand',
          details: 'This user already has access to the brand'
        }, { status: 400 })
      }
      
      return NextResponse.json({ 
        error: 'Failed to grant brand access',
        details: error?.message || 'Unknown error occurred'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Error in join POST API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 