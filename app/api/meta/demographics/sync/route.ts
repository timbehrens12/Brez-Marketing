/**
 * Meta Demographics Sync API
 * 
 * Handles the comprehensive 12-month demographics sync process
 * Supports both full sync initialization and incremental updates
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
    const { brandId, action = 'start_full_sync', force = false } = body

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    // Verify user has access to this brand (either as owner or through brand_access)
    const supabase = getSupabaseClient()
    
    // First check if user owns the brand
    const { data: brand } = await supabase
      .from('brands')
      .select('user_id')
      .eq('id', brandId)
      .single()

    const isOwner = brand?.user_id === userId
    
    if (!isOwner) {
      // If not owner, check brand_access table
      const { data: brandAccess } = await supabase
        .from('brand_access')
        .select('role')
        .eq('brand_id', brandId)
        .eq('user_id', userId)
        .eq('revoked_at', null)
        .single()

      if (!brandAccess) {
        return NextResponse.json({ error: 'Access denied to this brand' }, { status: 403 })
      }
    }

    const demographicsService = new MetaDemographicsService()

    switch (action) {
      case 'start_full_sync':
        // Start comprehensive 12-month sync
        const syncResult = await demographicsService.startComprehensiveSync(brandId)
        
        if (syncResult.success) {
          // Start background processing
          // Note: In production, this would be handled by a queue system like Bull/Agenda
          processJobsInBackground(brandId)
          
          return NextResponse.json({
            success: true,
            message: syncResult.message,
            jobsCreated: syncResult.jobsCreated,
            estimatedDuration: '2-4 hours',
            note: 'Sync is running in the background. Check progress via /api/meta/demographics/status'
          })
        } else {
          return NextResponse.json({
            success: false,
            error: syncResult.message
          }, { status: 500 })
        }

      case 'get_progress':
        // Get current sync progress
        const progress = await demographicsService.getSyncProgress(brandId)
        return NextResponse.json(progress)

      case 'pause_sync':
        // Pause ongoing sync
        await supabase
          .from('meta_demographics_sync_status')
          .update({ 
            overall_status: 'paused',
            updated_at: new Date().toISOString()
          })
          .eq('brand_id', brandId)
        
        return NextResponse.json({ success: true, message: 'Sync paused' })

      case 'resume_sync':
        // Resume paused sync
        await supabase
          .from('meta_demographics_sync_status')
          .update({ 
            overall_status: 'in_progress',
            updated_at: new Date().toISOString()
          })
          .eq('brand_id', brandId)
        
        // Restart background processing
        processJobsInBackground(brandId)
        
        return NextResponse.json({ success: true, message: 'Sync resumed' })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Demographics sync API error:', error)
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

    const demographicsService = new MetaDemographicsService()
    const progress = await demographicsService.getSyncProgress(brandId)
    
    return NextResponse.json(progress)
  } catch (error) {
    console.error('Demographics sync status API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}

/**
 * Background job processor
 * In production, this would be replaced with a proper queue system
 */
async function processJobsInBackground(brandId: string) {
  try {
    const supabase = getSupabaseClient()
    const demographicsService = new MetaDemographicsService()
    
    // Get pending jobs for this brand, ordered by priority
    const { data: jobs } = await supabase
      .from('meta_demographics_jobs_ledger_v2')
      .select('job_key, request_metadata')
      .eq('brand_id', brandId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10) // Process 10 jobs at a time

    if (!jobs || jobs.length === 0) {
      return
    }

    // Process jobs with concurrency control
    const concurrency = 2 // Process 2 jobs simultaneously
    const chunks = []
    for (let i = 0; i < jobs.length; i += concurrency) {
      chunks.push(jobs.slice(i, i + concurrency))
    }

    for (const chunk of chunks) {
      await Promise.all(
        chunk.map(job => 
          demographicsService.processJob(job.job_key)
            .catch(error => console.error(`Job ${job.job_key} failed:`, error))
        )
      )
      
      // Delay between chunks to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    // Check if there are more jobs to process
    const { data: remainingJobs } = await supabase
      .from('meta_demographics_jobs_ledger_v2')
      .select('job_key')
      .eq('brand_id', brandId)
      .eq('status', 'pending')
      .limit(1)

    if (remainingJobs && remainingJobs.length > 0) {
      // Schedule next batch
      setTimeout(() => processJobsInBackground(brandId), 5000)
    } else {
      // Mark sync as completed
      await supabase
        .from('meta_demographics_sync_status')
        .update({
          overall_status: 'completed',
          completed_at: new Date().toISOString(),
          current_phase: 'daily'
        })
        .eq('brand_id', brandId)
    }
  } catch (error) {
    console.error('Background job processing error:', error)
  }
}
