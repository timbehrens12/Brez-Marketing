import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Get the exact structure of existing data
    const { data: existingData, error: existingError } = await supabase
      .from('meta_ad_daily_insights')
      .select('*')
      .limit(1)
    
    if (existingError) {
      return NextResponse.json({ 
        error: 'Failed to get existing data',
        details: existingError 
      }, { status: 500 })
    }
    
    if (!existingData || existingData.length === 0) {
      return NextResponse.json({ 
        error: 'No existing data found' 
      }, { status: 404 })
    }
    
    const template = existingData[0]
    console.log('[Simple Test] Using template:', template)
    
    // Create a test record with the same structure but unique values
    const testRecord = {
      ...template,
      id: undefined, // Let it auto-generate
      ad_id: 'simple_test_' + Date.now(),
      ad_name: 'Simple Test Ad',
      spend: 5.00,
      impressions: 50,
      clicks: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    console.log('[Simple Test] Inserting:', testRecord)
    
    const { data: insertResult, error: insertError } = await supabase
      .from('meta_ad_daily_insights')
      .insert(testRecord)
      .select()
    
    if (insertError) {
      console.error('[Simple Test] Insert failed:', insertError)
      return NextResponse.json({
        success: false,
        error: 'Insert failed',
        details: insertError,
        testRecord,
        template
      })
    }
    
    console.log('[Simple Test] Insert successful:', insertResult)
    
    // Clean up the test record
    await supabase
      .from('meta_ad_daily_insights')
      .delete()
      .eq('ad_id', testRecord.ad_id)
    
    return NextResponse.json({
      success: true,
      message: 'Simple insert test successful',
      insertResult,
      template
    })

  } catch (error) {
    console.error('[Simple Test] Error:', error)
    return NextResponse.json({ 
      error: 'Failed to run simple insert test',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
