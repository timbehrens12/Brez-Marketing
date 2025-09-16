/**
 * Meta Demographics Processing Trigger
 * 
 * Simple endpoint to manually trigger job processing for testing
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
      return NextResponse.json({ 
        error: 'Brand ID is required', 
        usage: '/api/meta/demographics/trigger-processing?brandId=YOUR_BRAND_ID&confirm=true' 
      }, { status: 400 })
    }

    if (confirm !== 'true') {
      return NextResponse.json({ 
        message: 'Add &confirm=true to proceed with processing',
        usage: `/api/meta/demographics/trigger-processing?brandId=${brandId}&confirm=true`
      })
    }

    console.log(`[Demographics Trigger] Processing jobs for brand ${brandId}`)

    // Call the existing process-jobs endpoint internally
    const cronSecret = process.env.CRON_SECRET || 'your-cron-secret'
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.brezmarketingdashboard.com'
    
    const response = await fetch(`${baseUrl}/api/meta/demographics/process-jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cronSecret}`
      },
      body: JSON.stringify({
        brandId: brandId,
        maxJobs: 5,
        maxConcurrency: 1
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json({ 
        error: 'Failed to trigger processing',
        details: errorText,
        status: response.status
      }, { status: 500 })
    }

    const result = await response.json()
    
    return NextResponse.json({
      success: true,
      message: 'Job processing triggered successfully',
      details: result,
      nextSteps: result.jobsProcessed > 0 ? 
        'Some jobs were processed. Call this endpoint again to continue processing remaining jobs.' :
        'No jobs were processed. Either all jobs are complete or there are no pending jobs.'
    })

  } catch (error) {
    console.error('[Demographics Trigger] Error:', error)
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
    const { brandId, maxJobs = 5 } = body

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

    console.log(`[Demographics Trigger] Authenticated processing for brand ${brandId}`)

    // Call the process-jobs endpoint
    const cronSecret = process.env.CRON_SECRET || 'your-cron-secret'
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.brezmarketingdashboard.com'
    
    const response = await fetch(`${baseUrl}/api/meta/demographics/process-jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cronSecret}`
      },
      body: JSON.stringify({
        brandId: brandId,
        maxJobs: maxJobs,
        maxConcurrency: 1
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json({ 
        error: 'Failed to process jobs',
        details: errorText 
      }, { status: 500 })
    }

    const result = await response.json()
    
    return NextResponse.json({
      success: true,
      message: 'Jobs processed successfully',
      ...result
    })

  } catch (error) {
    console.error('[Demographics Trigger] POST Error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}
