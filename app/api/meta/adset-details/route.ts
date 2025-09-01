import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs'

export const dynamic = 'force-dynamic'

/**
 * API endpoint to get details of a specific ad set
 */
export async function GET(request: NextRequest) {
  try {
    // Verify user authentication
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - You must be logged in to access this resource' },
        { status: 401 }
      )
    }
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const brandId = searchParams.get('brandId')
    const adsetId = searchParams.get('adsetId')
    
    if (!brandId || !adsetId) {
      return NextResponse.json(
        { error: 'Brand ID and Ad Set ID are required parameters' },
        { status: 400 }
      )
    }
    
    // Initialize Supabase client
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )
    
    // Check if user has access to this brand
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('id')
      .eq('id', brandId)
      .single()
      
    if (brandError || !brand) {
      return NextResponse.json(
        { error: 'Brand not found or you do not have access to it' },
        { status: 404 }
      )
    }
    
    // Fetch the ad set details
    const { data: adSet, error: adSetError } = await supabase
      .from('meta_adsets')
      .select('*')
      .eq('brand_id', brandId)
      .eq('adset_id', adsetId)
      .single()
      
    if (adSetError) {
      console.error('Error fetching ad set details:', adSetError)
      return NextResponse.json(
        { error: 'Failed to fetch ad set details' },
        { status: 500 }
      )
    }
    
    if (!adSet) {
      return NextResponse.json(
        { error: 'Ad set not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      adSet
    })
  } catch (error: any) {
    console.error('Error in ad set details endpoint:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ad set details', details: error.message },
      { status: 500 }
    )
  }
} 