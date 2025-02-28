import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchMetaAdInsights } from '@/lib/services/meta-service'

export async function POST(request: NextRequest) {
  try {
    // Get all brands with active Meta connections
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    const { data: connections, error: connectionsError } = await supabase
      .from('platform_connections')
      .select('brand_id')
      .eq('platform_type', 'meta')
      .eq('status', 'active')

    if (connectionsError) {
      console.error('Error fetching connections:', connectionsError)
      return NextResponse.json({ error: 'Failed to fetch connections' }, { status: 500 })
    }

    // Get unique brand IDs
    const brandIds = [...new Set(connections.map(c => c.brand_id))]
    
    if (brandIds.length === 0) {
      return NextResponse.json({ message: 'No brands with active Meta connections' })
    }

    // Calculate date range (last 30 days)
    const endDate = new Date().toISOString().split('T')[0]
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    // Fetch insights for each brand
    const results = []
    
    for (const brandId of brandIds) {
      const result = await fetchMetaAdInsights(brandId, startDate, endDate)
      results.push({ brandId, ...result })
    }

    return NextResponse.json({ success: true, results })
  } catch (error) {
    console.error('Error in sync endpoint:', error)
    return NextResponse.json({ 
      error: 'Server error', 
      details: typeof error === 'object' && error !== null && 'message' in error 
        ? (error.message as string) 
        : 'Unknown error'
    }, { status: 500 })
  }
} 