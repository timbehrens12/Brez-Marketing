import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { getSupabaseClient } from '@/lib/supabase/client'

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params
    const supabase = getSupabaseClient()

    // Get share link data
    const { data: shareLink, error } = await supabase
      .from('brand_share_links')
      .select('*')
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

    // Get agency information for who created the share link
    const { data: agencyInfo, error: agencyError } = await supabase
      .from('agency_settings')
      .select('user_id, agency_name, agency_logo_url')
      .eq('user_id', shareLink.created_by)
      .single()

    if (agencyError) {
      console.error('Error loading agency info for share link creator:', agencyError)
    }

    // Handle both single brand and multi-brand scenarios
    let brandIds = []
    if (shareLink.is_multi_brand && shareLink.brand_ids) {
      brandIds = shareLink.brand_ids
    } else if (shareLink.brand_id) {
      brandIds = [shareLink.brand_id]
    }

    // Get brand information
    const { data: brands, error: brandsError } = await supabase
      .from('brands')
      .select('id, name, image_url, niche, user_id')
      .in('id', brandIds)

    if (brandsError) {
      console.error('Error loading brand info:', brandsError)
    }

    // Get platform connections for the brands
    const { data: connections, error: connectionsError } = await supabase
      .from('platform_connections')
      .select('brand_id, platform_type')
      .in('brand_id', brandIds)
      .eq('status', 'active')

    if (connectionsError) {
      console.error('Error loading connections:', connectionsError)
    }

    // Get agency information for each brand
    const brandOwnerIds = [...new Set(brands?.map(brand => brand.user_id) || [])]
    const { data: agencyInfos, error: agencyInfoError } = await supabase
      .from('agency_settings')
      .select('user_id, agency_name, agency_logo_url')
      .in('user_id', brandOwnerIds)

    if (agencyInfoError) {
      console.error('Error loading agency info:', agencyInfoError)
    }

    // Get user information for who created the share link
    let createdByUserInfo = null
    try {
      const user = await clerkClient.users.getUser(shareLink.created_by)
      createdByUserInfo = {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        emailAddress: user.emailAddresses?.[0]?.emailAddress,
        imageUrl: user.imageUrl,
        fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.emailAddresses?.[0]?.emailAddress || 'Unknown User'
      }
    } catch (error) {
      console.error('Error fetching creator user info from Clerk:', error)
    }

    // Combine brand data with agency info and connections
    const brandsWithDetails = (brands || []).map(brand => {
      const agencyInfo = (agencyInfos || []).find(agency => agency.user_id === brand.user_id)
      const brandConnections = (connections || []).filter(conn => conn.brand_id === brand.id)
      
      return {
        ...brand,
        agency_info: agencyInfo ? {
          name: agencyInfo.agency_name,
          logo_url: agencyInfo.agency_logo_url,
          user_id: agencyInfo.user_id
        } : null,
        connections: brandConnections.map(conn => conn.platform_type)
      }
    })

    // Return share link data (without sensitive info)
    return NextResponse.json({
      id: shareLink.id,
      role: shareLink.role,
      expires_at: shareLink.expires_at,
      max_uses: shareLink.max_uses,
      current_uses: shareLink.current_uses,
      created_at: shareLink.created_at,
      is_multi_brand: shareLink.is_multi_brand || false,
      brands: brandsWithDetails,
      created_by_user: createdByUserInfo,
      // Legacy fields for backward compatibility
      brand_id: shareLink.brand_id,
      brand: brandsWithDetails[0] || null
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

    // Handle both single brand and multi-brand scenarios
    let brandIds = []
    if (shareLink.is_multi_brand && shareLink.brand_ids) {
      brandIds = shareLink.brand_ids
    } else if (shareLink.brand_id) {
      brandIds = [shareLink.brand_id]
    }

    // Check if user already has access to any of these brands
    const { data: existingAccess, error: accessCheckError } = await supabase
      .from('brand_access')
      .select('brand_id, role')
      .in('brand_id', brandIds)
      .eq('user_id', userId)
      .is('revoked_at', null)

    // Check if user owns any of these brands
    const { data: ownedBrands } = await supabase
      .from('brands')
      .select('id, name')
      .in('id', brandIds)
      .eq('user_id', userId)

    // Filter out brands the user already has access to or owns
    const existingBrandIds = existingAccess?.map(access => access.brand_id) || []
    const ownedBrandIds = ownedBrands?.map(brand => brand.id) || []
    const alreadyAccessibleBrandIds = [...existingBrandIds, ...ownedBrandIds]
    
    const brandsToGrant = brandIds.filter((id: string) => !alreadyAccessibleBrandIds.includes(id))

    console.log('🔍 Brand access analysis:', {
      totalRequested: brandIds.length,
      alreadyHaveAccess: existingBrandIds.length,
      alreadyOwn: ownedBrandIds.length,
      willBeGranted: brandsToGrant.length,
      skippedBrands: alreadyAccessibleBrandIds
    })

    // If user is trying to join brands they created (self-sharing prevention)
    if (ownedBrandIds.length > 0 && ownedBrands) {
      const ownedBrandNames = ownedBrands.map(b => b.name)
      
      if (brandsToGrant.length === 0) {
        return NextResponse.json({ 
          error: `You cannot accept an invitation for brands you own`,
          message: `You already own: ${ownedBrandNames.join(', ')}`,
          owned_brands: ownedBrandIds
        }, { status: 400 })
      } else {
        // Mixed case: some owned, some not - we'll proceed but warn about owned ones
        console.log('⚠️ User owns some brands in invitation but will get access to others')
      }
    }

    // If user already has access to some/all brands
    if (existingBrandIds.length > 0 && brandsToGrant.length === 0) {
      return NextResponse.json({ 
        error: `You already have access to all these brands`,
        existing_brands: existingBrandIds
      }, { status: 400 })
    }

    // If no brands to grant access to (all owned or already accessible)
    if (brandsToGrant.length === 0) {
      return NextResponse.json({ 
        error: `No new brand access to grant`,
        message: `You already have access to or own all brands in this invitation`,
        already_accessible: alreadyAccessibleBrandIds
      }, { status: 400 })
    }

    // Check for any revoked access that needs to be restored (only for brands we'll grant access to)
    const { data: revokedAccess } = await supabase
      .from('brand_access')
      .select('id, brand_id, revoked_at')
      .in('brand_id', brandsToGrant)
      .eq('user_id', userId)
      .not('revoked_at', 'is', null)

    // Create access records only for brands that should be granted access
    try {
      const accessRecords = []
      const updateRecords = []

      for (const brandId of brandsToGrant) {
        const existingRevoked = revokedAccess?.find(access => access.brand_id === brandId)
        
        if (existingRevoked) {
          // Update existing revoked record
          updateRecords.push({
            id: existingRevoked.id,
            role: shareLink.role,
            granted_by: shareLink.created_by,
            granted_at: new Date().toISOString(),
            revoked_at: null,
            can_manage_platforms: shareLink.can_manage_platforms || false,
            can_generate_reports: shareLink.can_generate_reports !== false
          })
        } else {
          // Create new access record
          accessRecords.push({
            brand_id: brandId,
            user_id: userId,
            role: shareLink.role,
            granted_by: shareLink.created_by,
            granted_at: new Date().toISOString(),
            can_manage_platforms: shareLink.can_manage_platforms || false,
            can_generate_reports: shareLink.can_generate_reports !== false
          })
        }
      }

      let accessError = null

      // Insert new access records
      if (accessRecords.length > 0) {
        const { error } = await supabase
          .from('brand_access')
          .insert(accessRecords)
        
        accessError = error
      }

      // Update revoked access records
      if (updateRecords.length > 0 && !accessError) {
        for (const updateRecord of updateRecords) {
          const { error } = await supabase
            .from('brand_access')
            .update({
              role: updateRecord.role,
              granted_by: updateRecord.granted_by,
              granted_at: updateRecord.granted_at,
              revoked_at: updateRecord.revoked_at,
              can_manage_platforms: updateRecord.can_manage_platforms,
              can_generate_reports: updateRecord.can_generate_reports
            })
            .eq('id', updateRecord.id)
          
          if (error) {
            accessError = error
            break
          }
        }
      }

      if (accessError) {
        // Handle duplicate key constraint error gracefully
        if (accessError.code === '23505' && accessError.message?.includes('brand_access_brand_id_user_id_key')) {
          return NextResponse.json({ 
            error: 'You already have access to one or more of these brands',
            details: 'User already has access to some brands'
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

      const hasAnyRestoredAccess = updateRecords.length > 0
      const totalBrandsGranted = accessRecords.length + updateRecords.length
      const skippedBrands = alreadyAccessibleBrandIds

      // Prepare detailed messaging
      let message = hasAnyRestoredAccess ? 
        `Successfully restored access to ${totalBrandsGranted} brand${totalBrandsGranted > 1 ? 's' : ''}` : 
        `Successfully joined ${totalBrandsGranted} brand${totalBrandsGranted > 1 ? 's' : ''}`

      // Add information about skipped brands
      if (skippedBrands.length > 0) {
        const skippedCount = skippedBrands.length
        const skippedReason = ownedBrandIds.length > 0 ? 'already own' : 'already have access to'
        message += `. Skipped ${skippedCount} brand${skippedCount > 1 ? 's' : ''} you ${skippedReason}.`
      }

      return NextResponse.json({ 
        message,
        brandIds: brandsToGrant,
        brandCount: totalBrandsGranted,
        role: shareLink.role,
        can_manage_platforms: shareLink.can_manage_platforms || false,
        access_type: hasAnyRestoredAccess ? 'restored' : 'new',
        skipped_brands: skippedBrands.length > 0 ? {
          count: skippedBrands.length,
          brand_ids: skippedBrands,
          reason: ownedBrandIds.length > 0 ? 'owned' : 'already_accessible'
        } : null
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