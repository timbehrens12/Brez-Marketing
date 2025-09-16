/**
 * Debug Sync Status API
 * 
 * Provides detailed sync status information for troubleshooting
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const brandId = searchParams.get('brandId')

    if (!brandId) {
      return NextResponse.json({ 
        error: 'Brand ID is required. Usage: /api/debug/sync-status?brandId=YOUR_BRAND_ID' 
      }, { status: 400 })
    }

    console.log(`[Debug Sync] Checking sync status for brand ${brandId}`)

    const supabase = getSupabaseClient()

    // Check platform_connections
    const { data: connections } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')

    // Check ETL jobs
    const { data: etlJobs } = await supabase
      .from('etl_job')
      .select('*')
      .eq('brand_id', brandId)
      .like('job_type', 'meta_%')
      .order('created_at', { ascending: false })
      .limit(20)

    // Check demographics sync status
    const { data: demographicsStatus } = await supabase
      .from('meta_demographics_sync_status')
      .select('*')
      .eq('brand_id', brandId)

    // Check demographics jobs
    const { data: demographicsJobs } = await supabase
      .from('meta_demographics_jobs_ledger_v2')
      .select('*')
      .eq('brand_id', brandId)
      .order('created_at', { ascending: false })
      .limit(20)

    // Count job statuses
    const { data: allDemographicsJobs } = await supabase
      .from('meta_demographics_jobs_ledger_v2')
      .select('status')
      .eq('brand_id', brandId)

    const jobCounts = {
      total: allDemographicsJobs?.length || 0,
      pending: allDemographicsJobs?.filter(j => j.status === 'pending').length || 0,
      running: allDemographicsJobs?.filter(j => j.status === 'running').length || 0,
      completed: allDemographicsJobs?.filter(j => j.status === 'completed').length || 0,
      failed: allDemographicsJobs?.filter(j => j.status === 'failed').length || 0
    }

    // Check recent demographics data
    const { data: recentData } = await supabase
      .from('meta_demographics_facts')
      .select('date_value, breakdown_type, created_at')
      .eq('brand_id', brandId)
      .order('created_at', { ascending: false })
      .limit(5)

    return NextResponse.json({
      success: true,
      brandId,
      timestamp: new Date().toISOString(),
      
      platformConnections: connections || [],
      
      etlJobs: {
        recent: etlJobs || [],
        summary: {
          total: etlJobs?.length || 0,
          byStatus: {
            pending: etlJobs?.filter(j => j.status === 'pending').length || 0,
            running: etlJobs?.filter(j => j.status === 'running').length || 0,
            completed: etlJobs?.filter(j => j.status === 'completed').length || 0,
            failed: etlJobs?.filter(j => j.status === 'failed').length || 0
          }
        }
      },
      
      demographicsSync: {
        status: demographicsStatus || null,
        jobs: {
          recent: demographicsJobs || [],
          counts: jobCounts
        },
        recentData: recentData || []
      },
      
      analysis: {
        isStuck: (
          connections?.[0]?.sync_status === 'in_progress' &&
          jobCounts.running === 0 &&
          jobCounts.pending === 0
        ),
        hasRunningJobs: jobCounts.running > 0,
        hasPendingJobs: jobCounts.pending > 0,
        lastActivity: demographicsJobs?.[0]?.updated_at || demographicsJobs?.[0]?.created_at || 'none'
      }
    })

  } catch (error) {
    console.error('[Debug Sync] Error:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 })
  }
}
