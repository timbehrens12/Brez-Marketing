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
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const workerUrl = `${baseUrl}/api/worker/shopify`
    
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
    
    const result = await response.json()
    
    if (!response.ok) {
      throw new Error(`Worker API failed: ${result.error}`)
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
