/**
 * Meta Sync Status Reset API
 * 
 * Resets stuck sync statuses to allow retesting
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getSupabaseClient } from '@/lib/supabase/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const brandId = searchParams.get('brandId')
    const confirm = searchParams.get('confirm')

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required. Usage: /api/meta/reset-sync-status?brandId=YOUR_BRAND_ID&confirm=true' }, { status: 400 })
    }

    if (confirm !== 'true') {
      return NextResponse.json({ 
        message: 'Add &confirm=true to the URL to proceed with the reset',
        usage: `/api/meta/reset-sync-status?brandId=${brandId}&confirm=true`
      })
    }

    console.log(`[Meta Reset] Resetting sync status for brand ${brandId}`)

    const supabase = getSupabaseClient()

    // Reset platform_connections sync_status
    const { data: connectionUpdate, error: connectionError } = await supabase
      .from('platform_connections')
      .update({ 
        sync_status: 'completed',
        updated_at: new Date().toISOString() 
      })
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')
      .select('id, sync_status')

    if (connectionError) {
      console.error('[Meta Reset] Connection update error:', connectionError)
    } else {
      console.log('[Meta Reset] Updated connections:', connectionUpdate)
    }

    // Reset meta_demographics_sync_status if it exists
    const { data: demographicsUpdate, error: demographicsError } = await supabase
      .from('meta_demographics_sync_status')
      .update({
        overall_status: 'completed',
        updated_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      })
      .eq('brand_id', brandId)
      .select('brand_id, overall_status')

    if (demographicsError) {
      console.error('[Meta Reset] Demographics sync status update error:', demographicsError)
    } else {
      console.log('[Meta Reset] Updated demographics sync status:', demographicsUpdate)
    }

    // Reset any pending demographics jobs to failed state
    const { data: jobsUpdate, error: jobsError } = await supabase
      .from('meta_demographics_jobs_ledger_v2')
      .update({
        status: 'failed',
        error_message: 'Reset by user',
        updated_at: new Date().toISOString()
      })
      .eq('brand_id', brandId)
      .in('status', ['pending', 'running'])
      .select('job_key, status')

    if (jobsError) {
      console.error('[Meta Reset] Jobs update error:', jobsError)
    } else {
      console.log('[Meta Reset] Updated pending jobs:', jobsUpdate?.length || 0)
    }

    return NextResponse.json({
      success: true,
      message: 'Meta sync status reset successfully',
      details: {
        connectionsUpdated: connectionUpdate?.length || 0,
        demographicsStatusUpdated: demographicsUpdate?.length || 0,
        jobsReset: jobsUpdate?.length || 0
      }
    })

  } catch (error) {
    console.error('[Meta Reset] Error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { brandId } = body

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    // Verify user has access to this brand
    const supabase = getSupabaseClient()
    
    const { data: brand } = await supabase
      .from('brands')
      .select('user_id')
      .eq('id', brandId)
      .single()

    const isOwner = brand?.user_id === userId
    
    if (!isOwner) {
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

    console.log(`[Meta Reset] Resetting sync status for brand ${brandId}`)

    // Reset platform_connections sync_status
    const { data: connectionUpdate, error: connectionError } = await supabase
      .from('platform_connections')
      .update({ 
        sync_status: 'completed',
        updated_at: new Date().toISOString() 
      })
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')
      .select('id, sync_status')

    if (connectionError) {
      console.error('[Meta Reset] Connection update error:', connectionError)
    } else {
      console.log('[Meta Reset] Updated connections:', connectionUpdate)
    }

    // Reset meta_demographics_sync_status if it exists
    const { data: demographicsUpdate, error: demographicsError } = await supabase
      .from('meta_demographics_sync_status')
      .update({
        overall_status: 'completed',
        updated_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      })
      .eq('brand_id', brandId)
      .select('brand_id, overall_status')

    if (demographicsError) {
      console.error('[Meta Reset] Demographics sync status update error:', demographicsError)
    } else {
      console.log('[Meta Reset] Updated demographics sync status:', demographicsUpdate)
    }

    // Reset any pending demographics jobs to failed state
    const { data: jobsUpdate, error: jobsError } = await supabase
      .from('meta_demographics_jobs_ledger_v2')
      .update({
        status: 'failed',
        error_message: 'Reset by user',
        updated_at: new Date().toISOString()
      })
      .eq('brand_id', brandId)
      .in('status', ['pending', 'running'])
      .select('job_key, status')

    if (jobsError) {
      console.error('[Meta Reset] Jobs update error:', jobsError)
    } else {
      console.log('[Meta Reset] Updated pending jobs:', jobsUpdate?.length || 0)
    }

    return NextResponse.json({
      success: true,
      message: 'Meta sync status reset successfully',
      details: {
        connectionsUpdated: connectionUpdate?.length || 0,
        demographicsStatusUpdated: demographicsUpdate?.length || 0,
        jobsReset: jobsUpdate?.length || 0
      }
    })

  } catch (error) {
    console.error('[Meta Reset] Error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}
