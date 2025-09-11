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
  return GET(request)
}
