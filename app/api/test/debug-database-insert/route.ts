import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const { brandId } = await request.json()

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID required' }, { status: 400 })
    }

    console.log(`[Debug Database Insert] Testing database insert for brand: ${brandId}`)

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    // Test inserting a simple record similar to what the sync does
    const testInsight = {
      brand_id: brandId,
      date: '2025-03-21',
      spent: 0.29,
      impressions: 18,
      clicks: 1,
      purchase_count: 0,
      ctr: 5.555556,
      created_at: new Date().toISOString()
    }

    console.log(`[Debug Database Insert] Attempting to insert test record:`, testInsight)

    const { data, error } = await supabaseAdmin
      .from('meta_ad_daily_insights')
      .upsert(testInsight, {
        onConflict: 'brand_id,date'
      })

    if (error) {
      console.error(`[Debug Database Insert] ❌ Database insert error:`, error)
      return NextResponse.json({
        success: false,
        error: 'Database insert failed',
        details: error.message,
        code: error.code,
        hint: error.hint,
        testData: testInsight
      })
    }

    console.log(`[Debug Database Insert] ✅ Insert successful:`, data)

    // Check if the record was actually stored
    const { data: storedRecord, error: fetchError } = await supabaseAdmin
      .from('meta_ad_daily_insights')
      .select('*')
      .eq('brand_id', brandId)
      .eq('date', '2025-03-21')
      .single()

    return NextResponse.json({
      success: true,
      message: 'Database insert test completed',
      insertResult: data,
      storedRecord,
      fetchError: fetchError?.message || null
    })

  } catch (error) {
    console.error('[Debug Database Insert] Error:', error)
    return NextResponse.json({
      error: 'Debug database insert failed',
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
