import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔥 FORCE RESET - Clearing all Marketing Assistant data for user:', userId)

    // Get user's brands
    const { data: brands } = await supabase
      .from('brands')
      .select('id')
      .eq('user_id', userId)

    const brandIds = brands?.map(b => b.id) || []

    // Clear all recommendation data
    await supabase
      .from('ai_campaign_recommendations')
      .delete()
      .in('brand_id', brandIds)

    await supabase
      .from('recommendation_states')
      .delete()
      .eq('user_id', userId)

    await supabase
      .from('ai_recommendations')
      .delete()
      .in('brand_id', brandIds)

    console.log('✅ All Marketing Assistant data cleared for user:', userId)

    return NextResponse.json({
      success: true,
      message: 'Marketing Assistant data cleared. Hard refresh your browser (Ctrl+Shift+R) to clear localStorage.',
      clearedBrands: brandIds.length
    })
  } catch (error) {
    console.error('❌ Error in force reset:', error)
    return NextResponse.json({ 
      error: 'Failed to reset',
      details: error.message 
    }, { status: 500 })
  }
}

