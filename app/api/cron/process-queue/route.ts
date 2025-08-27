import { NextRequest, NextResponse } from 'next/server'

/**
 * Cron job to process the Shopify queue
 * This should be called every 1-2 minutes to process background jobs
 */
export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron call
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.log('[Cron Queue] Unauthorized access attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    console.log('[Cron Queue] Starting scheduled queue processing...')
    
    // Call the worker API to process jobs
    let baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000'
    
    // Ensure VERCEL_URL has protocol
    if (process.env.VERCEL_URL && !baseUrl.startsWith('http')) {
      baseUrl = `https://${process.env.VERCEL_URL}`
    }
    
    const workerUrl = `${baseUrl}/api/worker/shopify`
    
    console.log(`[Cron Queue] Calling worker at: ${workerUrl}`)
    
    const response = await fetch(workerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader || `Bearer ${cronSecret}` // Pass through auth
      },
      body: JSON.stringify({
        maxJobs: 5 // Process up to 5 jobs per cron run
      })
    })
    
    let result
    try {
      result = await response.json()
    } catch (parseError) {
      const responseText = await response.text()
      console.error(`[Cron Queue] Failed to parse worker response as JSON. Status: ${response.status}, Response: ${responseText.substring(0, 500)}`)
      throw new Error(`Worker API returned invalid JSON. Status: ${response.status}`)
    }
    
    if (!response.ok) {
      throw new Error(`Worker API failed: ${result.error || 'Unknown error'}`)
    }
    
    console.log('[Cron Queue] Queue processing completed:', result)
    
    return NextResponse.json({
      success: true,
      message: 'Queue processing completed',
      workerResult: result
    })
    
  } catch (error) {
    console.error('[Cron Queue] Error processing queue:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Also support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request)
}
