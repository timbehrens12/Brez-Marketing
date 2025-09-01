import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { auth } from '@clerk/nextjs/server'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient()

    // Get all user brands (owned + shared)
    const { data: ownedBrands } = await supabase
      .from('brands')
      .select('*')
      .eq('user_id', userId)
    
    // Get shared brands through brand_access
    const { data: sharedAccess } = await supabase
      .from('brand_access')
      .select('brand_id')
      .eq('user_id', userId)
      .is('revoked_at', null)

    let sharedBrands: any[] = []
    if (sharedAccess && sharedAccess.length > 0) {
      const sharedBrandIds = sharedAccess.map(access => access.brand_id)
      const { data: sharedBrandDetails } = await supabase
        .from('brands')
        .select('*')
        .in('id', sharedBrandIds)
      
      sharedBrands = sharedBrandDetails || []
    }

    // Combine owned and shared brands
    const brands = [...(ownedBrands || []), ...sharedBrands]
    
    return NextResponse.json({ 
      success: true,
      brands: brands
    })

  } catch (error) {
    console.error('[Brands API] Error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch brands' 
    }, { status: 500 })
  }
}
