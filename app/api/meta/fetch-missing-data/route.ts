import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { DataBackfillService } from '@/lib/services/dataBackfillService'

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { brandId, startDate, endDate, platformType = 'meta' } = await request.json()
    
    if (!brandId || !startDate || !endDate) {
      return NextResponse.json({ 
        error: 'Missing required fields: brandId, startDate, endDate' 
      }, { status: 400 })
    }

    // Verify user owns the brand
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    const { data: brand } = await supabase
      .from('brands')
      .select('user_id')
      .eq('id', brandId)
      .single()

    if (!brand || brand.user_id !== userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    console.log(`[FetchMissingData] Triggering data fetch for brand ${brandId}, range: ${startDate} to ${endDate}`)

    // Parse dates
    const start = new Date(startDate)
    const end = new Date(endDate)

    // Trigger the data fetch in background
    DataBackfillService.ensureDataForDateRange(brandId, start, end, platformType)
      .catch(error => {
        console.error('[FetchMissingData] Background fetch failed:', error)
      })

    return NextResponse.json({
      success: true,
      message: 'Data fetch initiated',
      brandId,
      dateRange: { startDate, endDate },
      platformType
    })

  } catch (error) {
    console.error('[FetchMissingData] Error:', error)
    return NextResponse.json({ 
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
