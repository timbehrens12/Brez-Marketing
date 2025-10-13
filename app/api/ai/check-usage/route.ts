import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const brandId = searchParams.get('brandId')
    const feature = searchParams.get('feature')

    if (!brandId || !feature) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    // Check if usage tracking exists
    const { data, error } = await supabase
      .from('ai_usage_tracking')
      .select('*')
      .eq('brand_id', brandId)
      .eq('feature_type', feature)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('[Check Usage] Error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    return NextResponse.json({
      hasUsage: !!data,
      usage: data || null
    })

  } catch (error) {
    console.error('[Check Usage] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

