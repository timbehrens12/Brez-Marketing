import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Get a sample record to see actual structure
    const { data: sampleData, error: sampleError } = await supabase
      .from('meta_ad_daily_insights')
      .select('*')
      .limit(1)
    
    console.log('[Debug] Sample data:', sampleData)
    console.log('[Debug] Sample error:', sampleError)
    
    // Try to get table structure via information_schema
    const { data: schemaData, error: schemaError } = await supabase
      .rpc('get_table_columns', { table_name: 'meta_ad_daily_insights' })
      .single()
    
    console.log('[Debug] Schema data:', schemaData)
    console.log('[Debug] Schema error:', schemaError)
    
    return NextResponse.json({
      success: true,
      sampleData,
      sampleError,
      schemaData,
      schemaError,
      message: 'Table structure debug completed'
    })

  } catch (error) {
    console.error('[Debug] Error:', error)
    return NextResponse.json({ 
      error: 'Failed to debug table structure',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
