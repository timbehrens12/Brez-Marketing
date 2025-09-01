import { NextResponse } from 'next/server'

/**
 * Test endpoint to manually trigger the worker
 */
export async function POST() {
  try {
    console.log('[Test Worker] Triggering worker manually...')
    
    let baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000'
    
    // Ensure VERCEL_URL has protocol
    if (process.env.VERCEL_URL && !baseUrl.startsWith('http')) {
      baseUrl = `https://${process.env.VERCEL_URL}`
    }
    
    const workerUrl = `${baseUrl}/api/worker/shopify`
    
    console.log(`[Test Worker] Calling worker at: ${workerUrl}`)
    
    const response = await fetch(workerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-call': 'true'
      },
      body: JSON.stringify({
        maxJobs: 10
      })
    })
    
    const result = await response.json()
    
    console.log('[Test Worker] Worker result:', result)
    
    return NextResponse.json({
      success: true,
      message: 'Worker triggered successfully',
      result
    })
    
  } catch (error) {
    console.error('[Test Worker] Error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    // Get queue status
    let baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000'
    
    // Ensure VERCEL_URL has protocol
    if (process.env.VERCEL_URL && !baseUrl.startsWith('http')) {
      baseUrl = `https://${process.env.VERCEL_URL}`
    }
    
    const statusUrl = `${baseUrl}/api/worker/shopify`
    
    const response = await fetch(statusUrl, {
      method: 'GET',
      headers: {
        'x-internal-call': 'true'
      }
    })
    
    const result = await response.json()
    
    return NextResponse.json({
      success: true,
      message: 'Queue status retrieved',
      result
    })
    
  } catch (error) {
    console.error('[Test Worker] Error getting status:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
