import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { brandId } = await request.json()

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID required' }, { status: 400 })
    }

    console.log(`[Manual Data Insert] Testing manual insert for brand: ${brandId}`)

    const supabase = createClient()

    // Try to manually insert a test record to see if database insert works
    const testRecord = {
      brand_id: brandId,
      date: '2025-09-12',
      spent: 1.00,
      impressions: 100,
      clicks: 2,
      purchase_count: 0,
      ctr: 2.0,
      created_at: new Date().toISOString()
    }

    console.log(`[Manual Data Insert] Inserting test record:`, testRecord)

    const { data, error } = await supabase
      .from('meta_ad_daily_insights')
      .upsert(testRecord, {
        onConflict: 'brand_id,date'
      })

    if (error) {
      console.error(`[Manual Data Insert] Database insert error:`, error)
      return NextResponse.json({
        success: false,
        error: 'Database insert failed',
        details: error.message,
        testRecord
      })
    }

    console.log(`[Manual Data Insert] Database insert successful:`, data)

    // Check if the record was actually stored
    const { data: storedRecord, error: fetchError } = await supabase
      .from('meta_ad_daily_insights')
      .select('*')
      .eq('brand_id', brandId)
      .eq('date', '2025-09-12')
      .single()

    return NextResponse.json({
      success: true,
      message: 'Manual data insert completed',
      testRecord,
      insertResult: data,
      storedRecord,
      fetchError: fetchError?.message || null
    })

  } catch (error) {
    console.error('[Manual Data Insert] Error:', error)
    return NextResponse.json({
      error: 'Manual data insert failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const brandId = url.searchParams.get('brandId')
  
  if (!brandId) {
    return NextResponse.json({ error: 'Brand ID required' }, { status: 400 })
  }

  return POST(new NextRequest(request.url, {
    method: 'POST',
    body: JSON.stringify({ brandId }),
    headers: { 'content-type': 'application/json' }
  }))
}
