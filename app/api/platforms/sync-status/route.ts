import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getSupabaseClient } from '@/lib/supabase/client'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const brandId = searchParams.get('brandId')
    const platformType = searchParams.get('platformType')

    if (!brandId || !platformType) {
      return NextResponse.json({ 
        error: 'Brand ID and platform type are required' 
      }, { status: 400 })
    }

    const supabase = getSupabaseClient()
    
    // Verify user has access to this brand
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
        return NextResponse.json({ 
          error: 'Access denied to this brand' 
        }, { status: 403 })
      }
    }

    // Get platform connection status
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('brand_id', brandId)
      .eq('platform_type', platformType)
      .eq('status', 'active')
      .single()

    if (connectionError && connectionError.code !== 'PGRST116') {
      console.error('Error fetching connection:', connectionError)
      return NextResponse.json({ 
        error: 'Failed to fetch connection status' 
      }, { status: 500 })
    }

    if (!connection) {
      return NextResponse.json({ 
        sync_status: 'not_connected',
        message: 'Platform not connected'
      })
    }

    // Get additional sync information based on platform type
    let additionalData = {}
    
    if (platformType === 'meta') {
      // Get Meta-specific sync status
      const { data: metaJobs } = await supabase
        .from('etl_job')
        .select('job_type, status, created_at, completed_at')
        .eq('brand_id', brandId)
        .like('job_type', 'meta_%')
        .order('created_at', { ascending: false })
        .limit(20)

      const { data: demographicsStatus } = await supabase
        .from('meta_demographics_sync_status')
        .select('*')
        .eq('brand_id', brandId)
        .single()

      additionalData = {
        recent_jobs: metaJobs || [],
        demographics_status: demographicsStatus,
        connection_metadata: connection.metadata
      }
    }

    return NextResponse.json({
      success: true,
      sync_status: connection.sync_status || 'completed',
      last_sync: connection.last_sync,
      created_at: connection.created_at,
      updated_at: connection.updated_at,
      ...additionalData
    })

  } catch (error) {
    console.error('Sync status error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
