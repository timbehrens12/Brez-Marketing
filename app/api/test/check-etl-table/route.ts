import { NextRequest, NextResponse } from 'next/server'

/**
 * Test endpoint to check if control.etl_job table exists and is accessible
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[ETL Table Check] Checking control.etl_job table...')

    // Import Supabase client
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = createClient()
    
    // Try to query the table structure
    console.log('[ETL Table Check] Checking table existence...')
    
    // First, try to query existing records
    const { data: existingJobs, error: queryError } = await supabase
      .from('control.etl_job')
      .select('*')
      .limit(5)
    
    if (queryError) {
      console.error('[ETL Table Check] Query error:', queryError)
      
      // Try without schema prefix
      console.log('[ETL Table Check] Trying without control schema...')
      const { data: jobsNoSchema, error: noSchemaError } = await supabase
        .from('etl_job')
        .select('*')
        .limit(5)
        
      if (noSchemaError) {
        console.error('[ETL Table Check] No schema error:', noSchemaError)
        
        return NextResponse.json({
          success: false,
          error: 'ETL table not accessible',
          controlSchemaError: queryError,
          noSchemaError: noSchemaError,
          suggestion: 'Table control.etl_job or etl_job does not exist'
        })
      }
      
      return NextResponse.json({
        success: true,
        message: 'ETL table found without control schema',
        table: 'etl_job',
        records: jobsNoSchema?.length || 0,
        sample: jobsNoSchema?.[0] || null
      })
    }

    // Test creating a dummy ETL job
    console.log('[ETL Table Check] Testing ETL job creation...')
    
    const testBrandId = '1a30f34b-b048-4f80-b880-6c61bd12c720'
    
    const { data: newJob, error: insertError } = await supabase
      .from('control.etl_job')
      .insert({
        brand_id: testBrandId,
        entity: 'test',
        job_type: 'test_check',
        status: 'queued',
        started_at: new Date().toISOString()
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('[ETL Table Check] Insert error:', insertError)
      
      return NextResponse.json({
        success: false,
        error: 'Cannot create ETL job',
        insertError: insertError,
        existingRecords: existingJobs?.length || 0
      })
    }

    // Clean up test job
    if (newJob?.id) {
      await supabase
        .from('control.etl_job')
        .delete()
        .eq('id', newJob.id)
    }

    return NextResponse.json({
      success: true,
      message: 'ETL table is working correctly',
      table: 'control.etl_job',
      existingRecords: existingJobs?.length || 0,
      testJobCreated: true,
      testJobId: newJob?.id
    })

  } catch (error) {
    console.error('[ETL Table Check] Error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
