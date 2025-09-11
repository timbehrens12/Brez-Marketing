import { NextRequest, NextResponse } from 'next/server'

/**
 * Simple endpoint to manually trigger Meta worker processing
 * This can be used for testing and debugging
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const maxJobs = parseInt(url.searchParams.get('maxJobs') || '5')

    console.log(`[Meta Trigger Worker] Triggering worker processing of ${maxJobs} jobs`)

    // Call the public worker endpoint
    const workerUrl = `${url.origin}/api/public-worker?maxJobs=${maxJobs}`

    const response = await fetch(workerUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Meta-Trigger-Worker/1.0'
      }
    })

    if (!response.ok) {
      throw new Error(`Worker endpoint returned ${response.status}`)
    }

    const result = await response.json()

    return NextResponse.json({
      success: true,
      message: `Triggered worker processing of ${maxJobs} jobs`,
      workerResult: result,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[Meta Trigger Worker] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { brandId, action } = body

    if (action === 'sync' && brandId) {
      // Manual sync for testing
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = createClient()

      // Get the active Meta connection for this brand
      const { data: connection, error: connectionError } = await supabase
        .from('platform_connections')
        .select('*')
        .eq('brand_id', brandId)
        .eq('platform_type', 'meta')
        .eq('status', 'active')
        .single()

      if (connectionError || !connection) {
        return NextResponse.json({
          success: false,
          error: 'No active Meta connection found for this brand'
        }, { status: 404 })
      }

      // Import Meta service and do a quick sync
      const { fetchMetaAdInsights } = await import('@/lib/services/meta-service')

      console.log(`[Meta Trigger Worker] Manual sync for brand ${brandId}`)

      // Sync last 7 days
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 7)

      const result = await fetchMetaAdInsights(brandId, startDate, endDate, false, false)

      return NextResponse.json({
        success: result.success,
        message: result.success ? 'Manual sync completed' : 'Manual sync failed',
        count: result.count,
        error: result.error
      })
    }

    return GET(request)
  } catch (error) {
    console.error('[Meta Trigger Worker] Error in POST:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
