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

    const { brandIds, role, expiresInDays = 7, maxUses = 1, canManagePlatforms = true } = await request.json()

    console.log('🔍 API received:', {
      userId,
      brandIds,
      brandIdsType: typeof brandIds,
      brandIdsLength: brandIds?.length,
      role,
      expiresInDays,
      maxUses,
      canManagePlatforms
    })

    if (!brandIds || !Array.isArray(brandIds) || brandIds.length === 0) {
      return NextResponse.json({ error: 'Brand IDs array is required' }, { status: 400 })
    }

    if (!role) {
      return NextResponse.json({ error: 'Role is required' }, { status: 400 })
    }

    // Deduplicate brand IDs to prevent issues with duplicate selections
    const uniqueBrandIds = [...new Set(brandIds)]
    console.log('🧹 Deduplicated brand IDs:', {
      original: brandIds.length,
      unique: uniqueBrandIds.length,
      duplicatesRemoved: brandIds.length - uniqueBrandIds.length,
      brandIds: uniqueBrandIds
    })

    const supabase = getSupabaseClient()

    // Verify user owns all the brands
    const { data: ownedBrands, error: brandsError } = await supabase
      .from('brands')
      .select('id, name, user_id')
      .in('id', uniqueBrandIds)
      .eq('user_id', userId)

    if (brandsError) {
      console.error('Error verifying brand ownership:', brandsError)
      return NextResponse.json({ error: 'Failed to verify brand ownership' }, { status: 500 })
    }

    if (!ownedBrands || ownedBrands.length !== uniqueBrandIds.length) {
      // Debug logging 
      console.log('❌ Ownership verification failed:', {
        reason: !ownedBrands ? 'No brands returned' : 'Count mismatch',
        expected: uniqueBrandIds.length,
        found: ownedBrands?.length || 0,
        missingBrandIds: uniqueBrandIds.filter(id => !ownedBrands?.some(b => b.id === id)),
        ownedBrands: ownedBrands?.map(b => ({ id: b.id, name: b.name, user_id: b.user_id })),
        requestedBrandIds: uniqueBrandIds,
        userIdFromClerk: userId
      })
      
      // Check what brands exist in database regardless of ownership
      const { data: allBrandsInDb } = await supabase
        .from('brands')
        .select('id, name, user_id')
        .in('id', uniqueBrandIds)
      
      console.log('🔍 All brands in DB with these IDs:', allBrandsInDb)
      
      return NextResponse.json({ error: 'You can only share brands you own' }, { status: 403 })
    }

    // Generate unique token
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiresInDays)

    // Create the multi-brand share link
    const insertData = {
      token,
      created_by: userId,
      brand_ids: uniqueBrandIds,
      role,
      expires_at: expiresAt.toISOString(),
      max_uses: maxUses,
      current_uses: 0,
      is_active: true,
      is_multi_brand: true,
      can_manage_platforms: canManagePlatforms
    }
    
    console.log('🔍 About to insert share link with data:', insertData)
    
    const { data: shareLink, error: insertError } = await supabase
      .from('brand_share_links')
      .insert(insertData)
      .select()
      .single()

    if (insertError) {
      console.error('Error creating share link:', insertError)
      return NextResponse.json({ error: 'Failed to create share link' }, { status: 500 })
    }

    // Generate the share URL
    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin}/join/${token}`

    console.log('✅ Share link created successfully:', {
      token,
      brandCount: uniqueBrandIds.length,
      brands: ownedBrands?.map(b => b.name) || [],
      role,
      expires_at: expiresAt.toISOString(),
      created_by: userId,
      shareLink_id: shareLink?.id
    })

    return NextResponse.json({
      success: true,
      message: `Share link created for ${uniqueBrandIds.length} brand${uniqueBrandIds.length > 1 ? 's' : ''}`,
      shareUrl,
      shareLink,
      brandCount: uniqueBrandIds.length
    })

  } catch (error) {
    console.error('Error in multi-brand share API:', error)
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

    const supabase = getSupabaseClient()

    // Revoke the share link (just set is_active to false)
    const { data: revokedLink, error: updateError } = await supabase
      .from('brand_share_links')
      .update({
        is_active: false
      })
      .eq('id', linkId)
      .eq('created_by', userId)
      .select()
      .single()

    if (updateError) {
      console.error('Error revoking share link:', updateError)
      return NextResponse.json({ error: 'Failed to revoke share link' }, { status: 500 })
    }

    if (!revokedLink) {
      return NextResponse.json({ error: 'Share link not found or already revoked' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: 'Share link revoked successfully'
    })

  } catch (error) {
    console.error('Error in revoke share link API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 