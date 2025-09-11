import { NextRequest, NextResponse } from 'next/server'

/**
 * Cron job to process the Shopify queue
 * This should be called every 1-2 minutes to process background jobs
 */
export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron call (Vercel cron jobs have specific user agent)
    const userAgent = request.headers.get('user-agent') || ''
    
    if (!userAgent.includes('vercel-cron')) {
      console.log('[Cron Queue] Unauthorized access attempt - not from Vercel cron')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    console.log('[Cron Queue] Starting scheduled queue processing v2.1...')
    
    // Get the current request URL to ensure we call the same deployment
    const requestUrl = new URL(request.url)
    const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`
    const workerUrl = `${baseUrl}/api/public-worker`
    
    console.log(`[Cron Queue] Request URL: ${request.url}`)
    console.log(`[Cron Queue] Base URL: ${baseUrl}`)
    console.log(`[Cron Queue] PUBLIC Worker URL: ${workerUrl}`)
    console.log(`[Cron Queue] VERCEL_URL: ${process.env.VERCEL_URL}`)
    
    // Use external domain to bypass potential internal routing issues
    const externalWorkerUrl = workerUrl.replace(requestUrl.host, 'www.brezmarketingdashboard.com')
    console.log(`[Cron Queue] EXTERNAL Worker URL: ${externalWorkerUrl}`)
    
    const response = await fetch(externalWorkerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'vercel-cron/1.0'
      },
      body: JSON.stringify({
        maxJobs: 5 // Process up to 5 jobs per cron run
      })
    })
    
    let result
    try {
      // Clone response before reading to avoid "Body is unusable" error
      const responseClone = response.clone()
      result = await response.json()
    } catch (parseError) {
      try {
        const responseText = await response.clone().text()
        console.error(`[Cron Queue] Failed to parse worker response as JSON. Status: ${response.status}, Response: ${responseText.substring(0, 500)}`)
      } catch (textError) {
        console.error(`[Cron Queue] Failed to read response as text or JSON. Status: ${response.status}`)
      }
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
// POST endpoint for manual triggering (no auth required for testing)
export async function POST(request: NextRequest) {
  console.log('[Cron Queue] Manual trigger via POST - bypassing auth check')

  try {
    console.log('[Cron Queue] Starting MANUAL queue processing...')

    // Get the current request URL to ensure we call the same deployment
    const requestUrl = new URL(request.url)
    const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`
    const workerUrl = `${baseUrl}/api/public-worker`

    console.log(`[Cron Queue] Request URL: ${request.url}`)
    console.log(`[Cron Queue] Base URL: ${baseUrl}`)
    console.log(`[Cron Queue] PUBLIC Worker URL: ${workerUrl}`)

    // Use external domain to bypass potential internal routing issues
    const externalWorkerUrl = workerUrl.replace(requestUrl.host, 'www.brezmarketingdashboard.com')
    console.log(`[Cron Queue] EXTERNAL Worker URL: ${externalWorkerUrl}`)

    const response = await fetch(externalWorkerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'manual-trigger/1.0'
      },
      body: JSON.stringify({
        maxJobs: 10 // Process more jobs for manual trigger
      })
    })

    let result
    try {
      // Clone response before reading to avoid "Body is unusable" error
      const responseClone = response.clone()
      result = await response.json()
    } catch (parseError) {
      try {
        const responseText = await response.clone().text()
        console.error(`[Cron Queue] Failed to parse worker response as JSON. Status: ${response.status}, Response: ${responseText.substring(0, 500)}`)
      } catch (textError) {
        console.error(`[Cron Queue] Failed to read response as text or JSON. Status: ${response.status}`)
      }
      throw new Error(`Worker API returned invalid JSON. Status: ${response.status}`)
    }

    if (!response.ok) {
      throw new Error(`Worker API failed: ${result.error || 'Unknown error'}`)
    }

    console.log('[Cron Queue] MANUAL queue processing completed:', result)

    return NextResponse.json({
      success: true,
      message: 'MANUAL queue processing completed',
      triggered: new Date().toISOString(),
      workerResult: result
    })

  } catch (error) {
    console.error('[Cron Queue] MANUAL Error processing queue:', error)

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      triggered: new Date().toISOString()
    }, { status: 500 })
  }
}
