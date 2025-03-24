import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const brandId = searchParams.get('brandId')

  if (!brandId) {
    return NextResponse.json({ error: 'Missing brandId' }, { status: 400 })
  }

  try {
    const { data: connection } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('platform_type', 'meta')
      .eq('brand_id', brandId)
      .eq('status', 'active')
      .single()

    if (!connection) {
      return NextResponse.json({ analytics: [] })
    }

    // TODO: Implement Meta API integration
    return NextResponse.json({ 
      analytics: [],
      metrics: {
        impressions: 0,
        clicks: 0,
        spend: 0,
        conversions: 0
      }
    })
  } catch (error) {
    console.error('Error fetching Meta analytics:', error)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
} 