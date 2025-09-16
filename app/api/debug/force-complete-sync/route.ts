/**
 * Force Complete Sync API
 * 
 * Forces completion of stuck sync jobs and resets status
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase/client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { brandId, confirm } = body

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    if (!confirm) {
      return NextResponse.json({ 
        message: 'This will force complete all stuck sync jobs. Add "confirm": true to proceed',
        warning: 'This action cannot be undone'
      })
    }

    console.log(`[Force Complete] Starting force completion for brand ${brandId}`)

    const supabase = getSupabaseClient()

    // 1. Reset any stuck running jobs to failed
    const { data: stuckJobs, error: jobUpdateError } = await supabase
      .from('meta_demographics_jobs_ledger_v2')
      .update({
        status: 'failed',
        updated_at: new Date().toISOString(),
        error_details: 'Force completed due to stuck sync'
      })
      .eq('brand_id', brandId)
      .eq('status', 'running')
      .select('id, job_type, status')

    console.log(`[Force Complete] Updated ${stuckJobs?.length || 0} stuck running jobs:`, stuckJobs)

    // 2. Mark any pending trigger jobs as failed
    const { data: triggerJobs, error: triggerError } = await supabase
      .from('meta_demographics_jobs_ledger_v2')
      .update({
        status: 'failed',
        updated_at: new Date().toISOString(),
        error_details: 'Force completed - trigger job stuck'
      })
      .eq('brand_id', brandId)
      .eq('status', 'pending')
      .contains('request_metadata', { trigger_full_sync: true })
      .select('id, job_type, status')

    console.log(`[Force Complete] Updated ${triggerJobs?.length || 0} stuck trigger jobs:`, triggerJobs)

    // 3. Set platform connection to completed
    const { data: connectionUpdate, error: connectionError } = await supabase
      .from('platform_connections')
      .update({ 
        sync_status: 'completed',
        updated_at: new Date().toISOString() 
      })
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')
      .select('id, sync_status')

    console.log(`[Force Complete] Updated platform connection:`, connectionUpdate)

    // 4. Set demographics sync to completed
    const { data: demographicsUpdate, error: demographicsError } = await supabase
      .from('meta_demographics_sync_status')
      .update({
        overall_status: 'completed',
        updated_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      })
      .eq('brand_id', brandId)
      .select('brand_id, overall_status')

    console.log(`[Force Complete] Updated demographics sync:`, demographicsUpdate)

    // 5. Get final job counts
    const { data: finalJobStats } = await supabase
      .from('meta_demographics_jobs_ledger_v2')
      .select('status')
      .eq('brand_id', brandId)

    const finalCounts = {
      total: finalJobStats?.length || 0,
      pending: finalJobStats?.filter(j => j.status === 'pending').length || 0,
      running: finalJobStats?.filter(j => j.status === 'running').length || 0,
      completed: finalJobStats?.filter(j => j.status === 'completed').length || 0,
      failed: finalJobStats?.filter(j => j.status === 'failed').length || 0
    }

    return NextResponse.json({
      success: true,
      message: 'Sync force completed successfully',
      actions: {
        stuckJobsFixed: stuckJobs?.length || 0,
        triggerJobsFixed: triggerJobs?.length || 0,
        connectionUpdated: connectionUpdate?.length > 0,
        demographicsUpdated: demographicsUpdate?.length > 0
      },
      finalJobCounts: finalCounts,
      errors: {
        jobUpdate: jobUpdateError?.message || null,
        trigger: triggerError?.message || null,
        connection: connectionError?.message || null,
        demographics: demographicsError?.message || null
      }
    })

  } catch (error) {
    console.error('[Force Complete] Error:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 })
  }
}
