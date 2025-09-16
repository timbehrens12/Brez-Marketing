/**
 * Meta Demographics Job Processor
 * 
 * Processes queued demographics sync jobs
 * Can be called manually or via cron job
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase/client'
import MetaDemographicsService from '@/lib/services/metaDemographicsService'

export async function POST(request: NextRequest) {
  try {
    // Verify authorization (internal service or cron)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'your-cron-secret'
    
    console.log(`[Demographics Processor] Auth header: ${authHeader ? `${authHeader.substring(0, 20)}...` : 'missing'}`)
    console.log(`[Demographics Processor] Expected: Bearer ${cronSecret ? `${cronSecret.substring(0, 10)}...` : 'undefined'}`)
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      console.log(`[Demographics Processor] Auth failed - header: "${authHeader}", expected: "Bearer ${cronSecret}"`)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { brandId, maxJobs = 5, maxConcurrency = 1 } = body

    const supabase = getSupabaseClient()
    const demographicsService = new MetaDemographicsService()

    // Get pending jobs
    let query = supabase
      .from('meta_demographics_jobs_ledger_v2')
      .select('job_key, brand_id, request_metadata')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(maxJobs)

    if (brandId) {
      query = query.eq('brand_id', brandId)
    }

    const { data: jobs, error: jobsError } = await query

    if (jobsError) {
      return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 })
    }

    if (!jobs || jobs.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No pending jobs to process',
        jobsProcessed: 0
      })
    }

    // Process jobs with concurrency control
    const results = []
    const chunks = []
    
    for (let i = 0; i < jobs.length; i += maxConcurrency) {
      chunks.push(jobs.slice(i, i + maxConcurrency))
    }

    let totalJobsProcessed = 0
    let totalRowsProcessed = 0
    let successfulJobs = 0
    let failedJobs = 0

    for (const chunk of chunks) {
      const chunkResults = await Promise.allSettled(
        chunk.map(async job => {
          // Check if this is a trigger job that needs to create the actual sync jobs
          if (job.request_metadata?.trigger_full_sync) {
            console.log(`[Demographics Processor] Processing trigger job ${job.job_key}`)
            return await demographicsService.processTriggerJob(job.job_key)
          } else {
            return await demographicsService.processJob(job.job_key)
          }
        })
      )

      for (const result of chunkResults) {
        totalJobsProcessed++
        
        if (result.status === 'fulfilled' && result.value.success) {
          successfulJobs++
          totalRowsProcessed += result.value.rowsProcessed
        } else {
          failedJobs++
        }
      }

      // Small delay between chunks to avoid overwhelming the system
      if (chunks.indexOf(chunk) < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    // Update sync status for affected brands
    if (brandId) {
      await updateSyncProgress(brandId)
    } else {
      // Update all brands that had jobs processed
      const uniqueBrands = [...new Set(jobs.map(job => job.brand_id))]
      for (const brand of uniqueBrands) {
        await updateSyncProgress(brand)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${totalJobsProcessed} jobs`,
      jobsProcessed: totalJobsProcessed,
      successfulJobs,
      failedJobs,
      totalRowsProcessed,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Job processor API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}

/**
 * Update sync progress for a brand
 */
async function updateSyncProgress(brandId: string) {
  const supabase = getSupabaseClient()
  
  // Count completed vs total jobs
  const { data: jobStats } = await supabase
    .from('meta_demographics_jobs_ledger_v2')
    .select('status')
    .eq('brand_id', brandId)

  if (!jobStats) return

  const totalJobs = jobStats.length
  const completedJobs = jobStats.filter(j => j.status === 'completed').length
  const failedJobs = jobStats.filter(j => j.status === 'failed').length
  const progressPercentage = totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0

  // Determine overall status
  let overallStatus = 'in_progress'
  if (completedJobs === totalJobs) {
    overallStatus = 'completed'
  } else if (failedJobs > totalJobs * 0.5) {
    overallStatus = 'failed'
  }

  // Update sync status
  await supabase
    .from('meta_demographics_sync_status')
    .update({
      days_completed: completedJobs,
      days_failed: failedJobs,
      overall_status: overallStatus,
      updated_at: new Date().toISOString(),
      ...(overallStatus === 'completed' && { completed_at: new Date().toISOString() })
    })
    .eq('brand_id', brandId)
}
