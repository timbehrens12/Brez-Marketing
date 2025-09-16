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
        console.log(`[Demographics Sync] Starting enqueue-only sync for brand ${brandId}`)
        
        // Quick validation - get connection info only
        const { data: connection } = await supabase
          .from('platform_connections')
          .select('id, metadata')
          .eq('brand_id', brandId)
          .eq('platform_type', 'meta')
          .eq('status', 'active')
          .single()

        if (!connection) {
          return NextResponse.json({
            success: false,
            error: 'No active Meta connection found'
          }, { status: 404 })
        }

        const rawAccountId = connection.metadata?.account_id || connection.metadata?.ad_account_id
        if (!rawAccountId) {
          return NextResponse.json({
            success: false,
            error: 'No Meta account ID found in connection metadata'
          }, { status: 400 })
        }

        const accountId = rawAccountId.replace('act_', '')

        // Check if there's already a trigger job for this brand (avoid duplicates)
        const { data: existingTrigger } = await supabase
          .from('meta_demographics_jobs_ledger_v2')
          .select('job_key, status')
          .eq('brand_id', brandId)
          .contains('breakdown_types', ['trigger_full_sync'])
          .in('status', ['pending', 'running'])
          .limit(1)
        
        if (existingTrigger && existingTrigger.length > 0) {
          console.log(`[Demographics Sync] ⚠️ Trigger job already exists: ${existingTrigger[0].job_key} (status: ${existingTrigger[0].status})`)
          return NextResponse.json({
            success: true,
            message: 'Trigger job already exists and is processing',
            note: 'Existing sync job is already running. Check progress via /api/meta/demographics/status'
          }, { status: 202 })
        }
        
        // Create a single lightweight job that will trigger the full sync in the background
        const jobKey = `meta_demographics_sync:${brandId}:${Date.now()}`
        
        console.log(`[Demographics Sync] ✅ Enqueuing trigger job ${jobKey} for brand ${brandId}`)
        
        const { error: queueError } = await supabase
          .from('meta_demographics_jobs_ledger_v2')
          .insert({
            brand_id: brandId,
            connection_id: connection.id,
            account_id: accountId,
            job_key: jobKey,
            breakdown_types: ['trigger_full_sync'], // Special marker
            level: 'campaign', // Use valid level value
            date_from: new Date().toISOString().split('T')[0],
            date_to: new Date().toISOString().split('T')[0],
            granularity: 'daily',
            status: 'pending',
            retry_count: 0,
            request_metadata: {
              priority: 0,
              created_by: 'enqueue_sync_api',
              trigger_full_sync: true
            }
          })

        if (queueError) {
          console.error('[Demographics Sync] Queue error:', queueError)
          return NextResponse.json({
            success: false,
            error: 'Failed to queue sync job'
          }, { status: 500 })
        }

        console.log(`[Demographics Sync] ✅ Enqueued trigger job ${jobKey} for brand ${brandId}`)

        // Trigger job processing asynchronously
        setImmediate(() => triggerContinuousJobProcessing(brandId))
        
        return NextResponse.json({
          success: true,
          queued: true,
          message: 'Demographics sync has been queued successfully',
          jobKey: jobKey,
          estimatedDuration: '2-4 hours',
          note: 'Sync is running in the background. Check progress via /api/meta/demographics/status'
        }, { status: 202 })

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
        
        // Restart job processing asynchronously
        setImmediate(() => triggerContinuousJobProcessing(brandId))
        
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
 * Trigger continuous job processing for all pending jobs
 * Calls the process-jobs endpoint multiple times to handle large batches
 */
async function triggerContinuousJobProcessing(brandId: string) {
  try {
    console.log(`[Demographics Continuous] Starting continuous processing for brand ${brandId}`)
    
    let totalProcessed = 0
    let iterations = 0
    const maxIterations = 60 // Prevent infinite loops (60 * 5 jobs = 300 jobs max)
    
    while (iterations < maxIterations) {
      iterations++
      
      const result = await triggerJobProcessing(brandId)
      if (!result || result.jobsProcessed === 0) {
        console.log(`[Demographics Continuous] No more jobs to process after ${totalProcessed} total jobs`)
        break
      }
      
      totalProcessed += result.jobsProcessed
      console.log(`[Demographics Continuous] Iteration ${iterations}: processed ${result.jobsProcessed} jobs (total: ${totalProcessed})`)
      
      // Short delay between iterations
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    console.log(`[Demographics Continuous] Completed: ${totalProcessed} total jobs processed in ${iterations} iterations`)
  } catch (error) {
    console.error(`[Demographics Continuous] Error:`, error)
  }
}

/**
 * Trigger job processing via dedicated endpoint
 * This is much simpler and avoids timeout issues
 */
async function triggerJobProcessing(brandId: string) {
  try {
    const cronSecret = process.env.CRON_SECRET || 'your-cron-secret'
    // Force the correct www domain to avoid redirects that strip headers
    const baseUrl = 'https://www.brezmarketingdashboard.com'
    
    console.log(`[Demographics Trigger] Starting job processing for brand ${brandId} at ${baseUrl}`)
    console.log(`[Demographics Trigger] NEXT_PUBLIC_APP_URL: ${process.env.NEXT_PUBLIC_APP_URL}`)
    console.log(`[Demographics Trigger] Using CRON_SECRET: ${cronSecret ? `${cronSecret.substring(0, 10)}...` : 'undefined'}`)
    
    // Call the dedicated process-jobs endpoint
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${cronSecret}`
    }
    
    console.log(`[Demographics Trigger] Calling ${baseUrl}/api/meta/demographics/process-jobs with auth: ${headers.Authorization.substring(0, 20)}...`)
    
    const response = await fetch(`${baseUrl}/api/meta/demographics/process-jobs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        brandId: brandId,
        maxJobs: 5, // Reduced for better performance
        maxConcurrency: 1 // Reduced for stability
      })
    })

    if (!response.ok) {
      console.error(`[Demographics Trigger] Process jobs call failed: ${response.status} ${response.statusText}`)
      return { success: false, jobsProcessed: 0 }
    }

    const result = await response.json()
    console.log(`[Demographics Trigger] ✅ Process jobs result: ${result.jobsProcessed} jobs processed`)
    return { success: true, jobsProcessed: result.jobsProcessed || 0 }

  } catch (error) {
    console.error(`[Demographics Trigger] Error triggering job processing for brand ${brandId}:`, error)
    return { success: false, jobsProcessed: 0 }
  }
}
