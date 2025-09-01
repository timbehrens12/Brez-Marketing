import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ShopifyBulkService } from '@/lib/services/shopifyBulkService'

// Background job processor for Shopify bulk operations
export async function POST(request: NextRequest) {
  try {
    console.log('[Bulk Processor] Starting bulk job processing check...')
    
    const supabase = createClient()
    
    // Get all running bulk jobs
    const { data: runningJobs, error: jobsError } = await supabase
      .from('shopify_bulk_jobs')
      .select(`
        *,
        platform_connections (
          shop,
          access_token,
          brand_id
        )
      `)
      .eq('status', 'RUNNING')
    
    if (jobsError) {
      console.error('[Bulk Processor] Error fetching running jobs:', jobsError)
      return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 })
    }
    
    if (!runningJobs?.length) {
      console.log('[Bulk Processor] No running jobs found')
      return NextResponse.json({ message: 'No running jobs to process' })
    }
    
    console.log(`[Bulk Processor] Found ${runningJobs.length} running jobs`)
    
    let completedJobs = 0
    let failedJobs = 0
    
    // Process each running job
    for (const job of runningJobs) {
      try {
        const connection = job.platform_connections
        if (!connection) {
          console.error(`[Bulk Processor] No connection found for job ${job.job_id}`)
          continue
        }
        
        // Check job status with Shopify
        const jobStatus = await ShopifyBulkService.checkBulkJobStatus(
          connection.shop,
          connection.access_token,
          job.job_id
        )
        
        console.log(`[Bulk Processor] Job ${job.job_id} status: ${jobStatus.status}`)
        
        if (jobStatus.status === 'COMPLETED') {
          // Process the completed job data
          await ShopifyBulkService.processBulkJobResults(
            job.job_id,
            job.job_type,
            connection.brand_id,
            job.connection_id,
            connection.shop,
            connection.access_token
          )
          
          completedJobs++
          
          // Check if all jobs for this connection are now complete
          await this.checkAndUpdateConnectionStatus(supabase, job.connection_id)
          
        } else if (jobStatus.status === 'FAILED' || jobStatus.status === 'CANCELED') {
          // Mark job as failed
          await supabase
            .from('shopify_bulk_jobs')
            .update({
              status: 'FAILED',
              error_code: jobStatus.errorCode,
              completed_at: new Date().toISOString()
            })
            .eq('job_id', job.job_id)
          
          failedJobs++
          
          // Check if we should mark the connection as failed
          await this.checkAndUpdateConnectionStatus(supabase, job.connection_id)
        }
        
        // Add a small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 100))
        
      } catch (error) {
        console.error(`[Bulk Processor] Error processing job ${job.job_id}:`, error)
        failedJobs++
      }
    }
    
    console.log(`[Bulk Processor] Completed processing: ${completedJobs} completed, ${failedJobs} failed`)
    
    return NextResponse.json({
      message: 'Bulk job processing completed',
      stats: {
        totalProcessed: runningJobs.length,
        completed: completedJobs,
        failed: failedJobs
      }
    })
    
  } catch (error) {
    console.error('[Bulk Processor] Error in bulk job processor:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Check if all bulk jobs for a connection are complete and update connection status
async function checkAndUpdateConnectionStatus(supabase: any, connectionId: string) {
  try {
    // Get all jobs for this connection
    const { data: allJobs } = await supabase
      .from('shopify_bulk_jobs')
      .select('status')
      .eq('connection_id', connectionId)
    
    if (!allJobs?.length) return
    
    const pendingJobs = allJobs.filter(job => ['RUNNING', 'CREATED'].includes(job.status))
    const failedJobs = allJobs.filter(job => job.status === 'FAILED')
    const completedJobs = allJobs.filter(job => job.status === 'COMPLETED')
    
    let newStatus = 'bulk_importing' // default
    
    if (pendingJobs.length === 0) {
      // All jobs are done
      if (failedJobs.length > 0 && completedJobs.length === 0) {
        // All jobs failed
        newStatus = 'failed'
      } else if (completedJobs.length > 0) {
        // At least some jobs completed successfully
        newStatus = 'completed'
      } else {
        // Shouldn't happen but handle gracefully
        newStatus = 'failed'
      }
      
      // Update connection status
      await supabase
        .from('platform_connections')
        .update({
          sync_status: newStatus,
          last_synced_at: new Date().toISOString(),
          metadata: {
            bulk_import_completed: true,
            total_jobs: allJobs.length,
            completed_jobs: completedJobs.length,
            failed_jobs: failedJobs.length,
            completed_at: new Date().toISOString()
          }
        })
        .eq('id', connectionId)
      
      console.log(`[Bulk Processor] Updated connection ${connectionId} status to: ${newStatus}`)
    }
    
  } catch (error) {
    console.error('[Bulk Processor] Error updating connection status:', error)
  }
}

// GET endpoint to manually trigger processing (for testing)
export async function GET() {
  return POST(new NextRequest('http://localhost/api/shopify/bulk/process'))
}
