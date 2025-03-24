import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get brandId from query parameters
    const url = new URL(request.url)
    const brandId = url.searchParams.get('brandId')
    
    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // Clear the meta_ad_insights table for this brand
    const { error: deleteError, count } = await supabase
      .from('meta_ad_insights')
      .delete({ count: 'exact' })
      .eq('brand_id', brandId)
    
    if (deleteError) {
      console.error('Error clearing Meta data:', deleteError)
      return NextResponse.json({ error: 'Failed to clear Meta data' }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Successfully cleared ${count} records from Meta data insights` 
    })
    
  } catch (error) {
    console.error('Error in clear Meta data endpoint:', error)
    return NextResponse.json({ 
      error: 'Server error', 
      details: typeof error === 'object' && error !== null && 'message' in error 
        ? (error.message as string) 
        : 'Unknown error' 
    }, { status: 500 })
  }
} 