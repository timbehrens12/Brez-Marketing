/**
 * Demographics Data Rollover Cron Job
 * 
 * Should be called daily to:
 * 1. Roll over old daily data to weekly
 * 2. Roll over old weekly data to monthly  
 * 3. Clean up old jobs
 * 4. Process any pending jobs
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase/client'
import MetaDemographicsService from '@/lib/services/metaDemographicsService'

export async function POST(request: NextRequest) {
  try {
    // Verify this is called from Vercel Cron or internal service
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'dev-cron-secret'
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const demographicsService = new MetaDemographicsService()
    const supabase = getSupabaseClient()
    
    const results = {
      rollover: null as any,
      jobsProcessed: 0,
      cleanup: null as any,
      errors: [] as string[]
    }

    // 1. Perform data rollover (daily → weekly → monthly)
    try {
      results.rollover = await demographicsService.performDataRollover()
      if (!results.rollover.success) {
        results.errors.push(`Rollover failed: ${results.rollover.message}`)
      }
    } catch (error) {
      results.errors.push(`Rollover error: ${error.message}`)
    }

    // 2. Process pending jobs (up to 50 jobs per cron run)
    try {
      const { data: pendingJobs } = await supabase
        .from('meta_demographics_jobs_ledger_v2')
        .select('job_key, brand_id')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(100)

      if (pendingJobs && pendingJobs.length > 0) {
        // Process jobs with concurrency control
        const concurrency = 5
        const chunks = []
        for (let i = 0; i < pendingJobs.length; i += concurrency) {
          chunks.push(pendingJobs.slice(i, i + concurrency))
        }

        for (const chunk of chunks) {
          const chunkResults = await Promise.allSettled(
            chunk.map(job => demographicsService.processJob(job.job_key))
          )
          
          results.jobsProcessed += chunkResults.filter(r => 
            r.status === 'fulfilled' && r.value.success
          ).length

          // Small delay between chunks
          if (chunks.indexOf(chunk) < chunks.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 200))
          }
        }
      }
    } catch (error) {
      results.errors.push(`Job processing error: ${error.message}`)
    }

    // 3. Clean up old completed jobs (older than 30 days)
    try {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      
      const { count } = await supabase
        .from('meta_demographics_jobs_ledger_v2')
        .delete()
        .eq('status', 'completed')
        .lt('completed_at', thirtyDaysAgo.toISOString())

      results.cleanup = { deletedJobs: count || 0 }
    } catch (error) {
      results.errors.push(`Cleanup error: ${error.message}`)
    }

    // 4. Update sync status for all active brands
    try {
      const { data: activeBrands } = await supabase
        .from('meta_demographics_sync_status')
        .select('brand_id')
        .neq('overall_status', 'completed')

      if (activeBrands) {
        for (const brand of activeBrands) {
          await updateSyncProgress(brand.brand_id)
        }
      }
    } catch (error) {
      results.errors.push(`Sync status update error: ${error.message}`)
    }

    return NextResponse.json({
      success: results.errors.length === 0,
      message: `Cron job completed. Processed ${results.jobsProcessed} jobs.`,
      results,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Demographics cron job error:', error)
    return NextResponse.json({ 
      error: 'Cron job failed',
      details: error.message 
    }, { status: 500 })
  }
}

/**
 * Update sync progress for a brand
 */
async function updateSyncProgress(brandId: string) {
  const supabase = getSupabaseClient()
  
  try {
    // Count job statuses
    const { data: jobStats } = await supabase
      .from('meta_demographics_jobs_ledger_v2')
      .select('status')
      .eq('brand_id', brandId)

    if (!jobStats || jobStats.length === 0) return

    const totalJobs = jobStats.length
    const completedJobs = jobStats.filter(j => j.status === 'completed').length
    const failedJobs = jobStats.filter(j => j.status === 'failed').length
    const runningJobs = jobStats.filter(j => j.status === 'running').length
    
    // Determine overall status
    const finishedJobs = completedJobs + failedJobs
    let overallStatus = 'in_progress'
    let currentPhase = 'historical'
    
    if (finishedJobs === totalJobs) {
      overallStatus = 'completed'
      currentPhase = 'daily'
    } else if (failedJobs > totalJobs * 0.5) {
      overallStatus = 'failed'
    } else if (runningJobs > 0) {
      overallStatus = 'in_progress'
    }

    // Update sync status
    await supabase
      .from('meta_demographics_sync_status')
      .update({
        days_completed: completedJobs,
        days_failed: failedJobs,
        total_days_target: totalJobs, // Fix: Update total to match actual job count
        overall_status: overallStatus,
        current_phase: currentPhase,
        total_rows_processed: completedJobs * 50, // Estimate
        updated_at: new Date().toISOString(),
        ...(overallStatus === 'completed' && { completed_at: new Date().toISOString() })
      })
      .eq('brand_id', brandId)
  } catch (error) {
    console.error(`Error updating sync progress for brand ${brandId}:`, error)
  }
}
