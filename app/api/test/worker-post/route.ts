import { NextRequest, NextResponse } from 'next/server'

/**
 * Test POST to worker API specifically
 */
export async function GET(request: NextRequest) {
  try {
    // Get the current request URL to ensure we call the same deployment
    const requestUrl = new URL(request.url)
    const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`
    const workerUrl = `${baseUrl}/api/worker/shopify`
    
    console.log(`[Worker POST Test] Calling worker POST at: ${workerUrl}`)
    
    const response = await fetch(workerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-call': 'true'
      },
      body: JSON.stringify({
        maxJobs: 1
      })
    })
    
    console.log(`[Worker POST Test] Response status: ${response.status}`)
    
    let result
    let responseText = ''
    
    try {
      const responseClone = response.clone()
      result = await response.json()
    } catch (parseError) {
      try {
        responseText = await response.text()
      } catch (textError) {
        responseText = 'Failed to read response body'
      }
      console.error(`[Worker POST Test] Failed to parse response: ${responseText.substring(0, 500)}`)
      return NextResponse.json({
        success: false,
        error: 'Failed to parse worker response',
        status: response.status,
        responseText: responseText.substring(0, 500)
      })
    }
    
    return NextResponse.json({
      success: true,
      message: 'Successfully called worker API (POST)',
      workerUrl,
      status: response.status,
      result
    })
    
  } catch (error) {
    console.error('[Worker POST Test] Error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
