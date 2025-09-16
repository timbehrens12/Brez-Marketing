/**
 * Meta Demographics Data Rollover API
 * 
 * Handles automatic data rollover from daily → weekly → monthly
 * Should be called via cron job daily
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase/client'
import MetaDemographicsService from '@/lib/services/metaDemographicsService'

export async function POST(request: NextRequest) {
  try {
    // Verify this is called from a cron job or internal service
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'your-cron-secret'
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const demographicsService = new MetaDemographicsService()
    
    // Perform data rollover
    const rolloverResult = await demographicsService.performDataRollover()
    
    if (rolloverResult.success) {
      // Also clean up old jobs
      await cleanupOldJobs()
      
      return NextResponse.json({
        success: true,
        message: rolloverResult.message,
        timestamp: new Date().toISOString()
      })
    } else {
      return NextResponse.json({
        success: false,
        error: rolloverResult.message
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Demographics rollover API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}

/**
 * Clean up old completed jobs (keep for 30 days)
 */
async function cleanupOldJobs() {
  const supabase = getSupabaseClient()
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  
  await supabase
    .from('meta_demographics_jobs_ledger_v2')
    .delete()
    .eq('status', 'completed')
    .lt('completed_at', thirtyDaysAgo.toISOString())
}
