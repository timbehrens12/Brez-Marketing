import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const brandId = '0da80e8f-2df3-468d-9053-08fa4d24e6e8'
    const connectionId = '05ed6df6-4f7f-4d9c-8806-924846803f54'
    
    const supabase = createClient()
    
    // First, let's check what the meta_ad_insights table structure looks like
    const { data: tableStructure, error: structureError } = await supabase
      .from('meta_ad_insights')
      .select('*')
      .limit(1)
    
    console.log('[Test] Table structure check:', { tableStructure, structureError })
    
    // Try to insert a simple test record
    const testRecord = {
      brand_id: brandId,
      connection_id: connectionId,
      account_id: 'act_498473601902770',
      ad_id: 'test_ad_123',
      campaign_id: 'test_campaign_456', 
      impressions: 100,
      clicks: 5,
      spend: 10.50,
      reach: 80,
      cpm: 105.0,
      cpc: 2.10,
      ctr: 5.0,
      date: '2025-09-10',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    console.log('[Test] Attempting to insert:', testRecord)
    
    const { data: insertResult, error: insertError } = await supabase
      .from('meta_ad_insights')
      .insert(testRecord)
      .select()
    
    if (insertError) {
      console.error('[Test] Insert failed:', insertError)
      return NextResponse.json({
        success: false,
        error: 'Insert failed',
        details: insertError,
        testRecord,
        tableCheck: { tableStructure, structureError }
      })
    }
    
    console.log('[Test] Insert successful:', insertResult)
    
    // Clean up the test record
    await supabase
      .from('meta_ad_insights')
      .delete()
      .eq('ad_id', 'test_ad_123')
    
    return NextResponse.json({
      success: true,
      message: 'Test insert successful',
      insertResult,
      testRecord,
      tableCheck: { tableStructure, structureError }
    })
    
  } catch (error) {
    console.error('[Test] Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
