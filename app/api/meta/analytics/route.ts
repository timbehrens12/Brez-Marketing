import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const brandId = searchParams.get('brandId')
  
  if (!brandId) {
    return NextResponse.json({ error: 'Missing brandId' }, { status: 400 })
  }

  try {
    // Get Meta connection
    const { data: connection } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')
      .single()

    if (!connection) {
      return NextResponse.json({ 
        adSpend: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        data: []
      })
    }

    // Fetch from Meta API
    const response = await fetch(
      `https://graph.facebook.com/v18.0/act_${connection.ad_account_id}/insights?` +
      `fields=spend,impressions,clicks,conversions&` +
      `access_token=${connection.access_token}`
    )

    const data = await response.json()

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching Meta analytics:', error)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
} 