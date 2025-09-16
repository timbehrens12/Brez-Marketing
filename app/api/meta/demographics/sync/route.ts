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
          // Return immediately - don't trigger any background processing from here
          // Background processing should be handled separately by cron jobs or manual triggers
          console.log(`[Demographics Sync] Created ${syncResult.jobsCreated} jobs for brand ${brandId}`)
          
          return NextResponse.json({
            success: true,
            message: syncResult.message,
            jobsCreated: syncResult.jobsCreated,
            estimatedDuration: '2-4 hours',
            note: 'Jobs created successfully. Use /api/meta/demographics/process-jobs to start processing.'
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
        
        // Don't automatically restart processing - let user manually trigger via process-jobs endpoint
        console.log(`[Demographics Sync] Sync resumed for brand ${brandId}. Use /api/meta/demographics/process-jobs to process jobs.`)
        
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

