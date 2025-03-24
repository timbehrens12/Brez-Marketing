import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchMetaAdInsights } from '@/lib/services/meta-service'

// This endpoint will be called by a scheduled job (e.g., Vercel Cron)
export async function POST(request: NextRequest) {
  try {
    // Verify the request is from our scheduler
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 30)

    // Fetch insights for each brand
    const results = []
    
    for (const brandId of brandIds) {
      try {
        console.log(`Running Meta sync for brand ${brandId}`)
        const result = await fetchMetaAdInsights(brandId, startDate, endDate)
        results.push({ brandId, ...result })
      } catch (error) {
        console.error(`Error syncing Meta data for brand ${brandId}:`, error)
        results.push({ 
          brandId, 
          success: false, 
          error: 'Error syncing Meta data',
          details: error 
        })
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Meta data sync completed for ${results.length} brands`,
      results 
    })
  } catch (error) {
    console.error('Error in Meta cron job:', error)
    return NextResponse.json({ 
      error: 'Server error', 
      details: typeof error === 'object' && error !== null && 'message' in error 
        ? (error.message as string) 
        : 'Unknown error'
    }, { status: 500 })
  }
} 