import { NextRequest, NextResponse } from "next/server"
import { createClient } from '@/lib/supabase/server'

// DELETE - Clear all brand reports for a specific brand
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const brandId = searchParams.get('brandId')
    const userId = searchParams.get('userId')

    if (!brandId || !userId) {
      return NextResponse.json(
        { error: 'Missing brandId or userId parameters' }, 
        { status: 400 }
      )
    }

    console.log(`Clearing all reports for brand ${brandId}, user ${userId}`)
    
    const serviceClient = createClient()
    
    const { error } = await serviceClient
      .from('ai_marketing_reports')
      .delete()
      .eq('brand_id', brandId)
      .eq('user_id', userId)
    
    if (error) {
      console.error('Error clearing reports:', error)
      return NextResponse.json(
        { error: 'Failed to clear reports' }, 
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'All brand reports cleared successfully'
    })
    
  } catch (error) {
    console.error('Exception clearing reports:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
} 