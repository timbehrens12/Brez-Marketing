import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const brandId = searchParams.get('brandId')
    const secret = searchParams.get('secret')

    // Simple security check
    if (secret !== 'reset-usage-only') {
      return NextResponse.json({ error: 'Invalid secret' }, { status: 403 })
    }

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    // Delete only marketing_analysis usage records
    const { error: usageError } = await supabase
      .from('ai_usage_tracking')
      .delete()
      .eq('brand_id', brandId)
      .eq('feature_type', 'marketing_analysis')

    if (usageError) {
      console.error('[Reset Usage] Error deleting usage:', usageError)
      return NextResponse.json({ error: 'Failed to delete usage records' }, { status: 500 })
    }

    console.log(`[Reset Usage] Successfully reset usage for brand: ${brandId}`)

    return NextResponse.json({ 
      success: true,
      message: 'Usage tracking reset successfully'
    })

  } catch (error) {
    console.error('[Reset Usage] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

