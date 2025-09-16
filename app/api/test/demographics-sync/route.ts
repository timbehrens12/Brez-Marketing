/**
 * Test Demographics Sync API
 * 
 * Manual trigger for testing the demographics sync system
 * Can be used to test specific date ranges or breakdown types
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getSupabaseClient } from '@/lib/supabase/client'
import MetaDemographicsService from '@/lib/services/metaDemographicsService'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      brandId, 
      action = 'start_sync',
      testMode = true,
      dateFrom,
      dateTo,
      breakdownType = 'age_gender'
    } = body

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    // Verify user has access to this brand
    const supabase = getSupabaseClient()
    const { data: brandAccess } = await supabase
      .from('brand_access')
      .select('role')
      .eq('brand_id', brandId)
      .eq('user_id', userId)
      .single()

    if (!brandAccess) {
      return NextResponse.json({ error: 'Access denied to this brand' }, { status: 403 })
    }

    const demographicsService = new MetaDemographicsService()

    switch (action) {
      case 'start_sync':
        // Start full 12-month sync
        const syncResult = await demographicsService.startComprehensiveSync(brandId)
        return NextResponse.json(syncResult)

      case 'check_progress':
        // Get sync progress
        const progress = await demographicsService.getSyncProgress(brandId)
        return NextResponse.json(progress)

      case 'test_date_range':
        // Test specific date range
        if (!dateFrom || !dateTo) {
          return NextResponse.json({ error: 'dateFrom and dateTo required for test' }, { status: 400 })
        }
        
        const testData = await demographicsService.getDemographicsForWidget(
          brandId,
          dateFrom,
          dateTo,
          breakdownType,
          'campaign'
        )
        
        return NextResponse.json({
          success: true,
          data: testData,
          dateRange: { from: dateFrom, to: dateTo },
          breakdownType,
          recordCount: testData.length
        })

      case 'process_jobs':
        // Manually process pending jobs
        const { data: pendingJobs } = await supabase
          .from('meta_demographics_jobs_ledger_v2')
          .select('job_key')
          .eq('brand_id', brandId)
          .eq('status', 'pending')
          .limit(5)

        if (!pendingJobs || pendingJobs.length === 0) {
          return NextResponse.json({ 
            success: true, 
            message: 'No pending jobs to process',
            jobsProcessed: 0
          })
        }

        let successfulJobs = 0
        const results = []

        for (const job of pendingJobs) {
          try {
            const result = await demographicsService.processJob(job.job_key)
            results.push({ jobKey: job.job_key, success: result.success, rowsProcessed: result.rowsProcessed })
            if (result.success) successfulJobs++
          } catch (error) {
            results.push({ jobKey: job.job_key, success: false, error: error.message })
          }
        }

        return NextResponse.json({
          success: true,
          message: `Processed ${successfulJobs}/${pendingJobs.length} jobs successfully`,
          jobsProcessed: successfulJobs,
          results
        })

      case 'reset_sync':
        // Reset sync status (for testing)
        await supabase
          .from('meta_demographics_sync_status')
          .delete()
          .eq('brand_id', brandId)
        
        await supabase
          .from('meta_demographics_jobs_ledger_v2')
          .delete()
          .eq('brand_id', brandId)

        return NextResponse.json({ success: true, message: 'Sync status reset' })

      case 'rollover_test':
        // Test rollover functionality
        const rolloverResult = await demographicsService.performDataRollover()
        return NextResponse.json(rolloverResult)

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    console.error('Test demographics sync error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const brandId = searchParams.get('brandId')

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    const supabase = getSupabaseClient()
    
    // Get comprehensive sync status
    const { data: syncStatus } = await supabase
      .from('meta_demographics_sync_status')
      .select('*')
      .eq('brand_id', brandId)
      .single()

    const { data: jobStats } = await supabase
      .from('meta_demographics_jobs_ledger_v2')
      .select('status, granularity, created_at, completed_at')
      .eq('brand_id', brandId)
      .order('created_at', { ascending: false })
      .limit(100)

    const { data: dataStats } = await supabase
      .from('meta_demographics_facts')
      .select('grain, breakdown_type, date_value')
      .eq('brand_id', brandId)
      .order('date_value', { ascending: false })
      .limit(10)

    return NextResponse.json({
      success: true,
      syncStatus: syncStatus || null,
      jobStats: {
        total: jobStats?.length || 0,
        pending: jobStats?.filter(j => j.status === 'pending').length || 0,
        running: jobStats?.filter(j => j.status === 'running').length || 0,
        completed: jobStats?.filter(j => j.status === 'completed').length || 0,
        failed: jobStats?.filter(j => j.status === 'failed').length || 0,
        recentJobs: jobStats?.slice(0, 10) || []
      },
      dataStats: {
        totalRecords: dataStats?.length || 0,
        latestDate: dataStats?.[0]?.date_value || null,
        availableGrains: [...new Set(dataStats?.map(d => d.grain) || [])],
        availableBreakdowns: [...new Set(dataStats?.map(d => d.breakdown_type) || [])]
      }
    })

  } catch (error) {
    console.error('Test demographics status error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}
