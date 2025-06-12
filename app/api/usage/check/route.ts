import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServiceClient } from '@/lib/supabase/client'
import { auth } from '@clerk/nextjs/server'

const supabase = getSupabaseServiceClient()

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { brandId, leadsToGenerate } = await request.json()

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID required' }, { status: 400 })
    }

    // Check and update usage using the database function
    const { data: usageResult, error } = await supabase
      .rpc('check_and_update_usage', {
        p_user_id: userId,
        p_brand_id: brandId,
        p_leads_to_generate: leadsToGenerate || 1
      })

    if (error) {
      console.error('Usage check error:', error)
      return NextResponse.json({ error: 'Failed to check usage limits' }, { status: 500 })
    }

    return NextResponse.json(usageResult)

  } catch (error) {
    console.error('Usage tracking error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const brandId = searchParams.get('brandId')

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID required' }, { status: 400 })
    }

    // Get current usage using the database function
    const { data: usageResult, error } = await supabase
      .rpc('get_current_usage', {
        p_user_id: userId,
        p_brand_id: brandId
      })

    if (error) {
      console.error('Usage fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch usage data' }, { status: 500 })
    }

    return NextResponse.json(usageResult)

  } catch (error) {
    console.error('Usage tracking error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 