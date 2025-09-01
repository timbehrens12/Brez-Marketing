import { NextRequest, NextResponse } from 'next/server'

/**
 * Simple test that calls the worker API directly
 */
export async function GET(request: NextRequest) {
  try {
    // Get the current request URL to ensure we call the same deployment
    const requestUrl = new URL(request.url)
    const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`
    const workerUrl = `${baseUrl}/api/worker/shopify`
    
    console.log(`[Simple Worker Test] Calling worker at: ${workerUrl}`)
    
    const response = await fetch(workerUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-call': 'true'
      }
    })
    
    console.log(`[Simple Worker Test] Response status: ${response.status}`)
    
    let result
    let responseText = ''
    
    try {
      // Clone response first to avoid "Body has already been consumed"
      const responseClone = response.clone()
      result = await response.json()
    } catch (parseError) {
      try {
        responseText = await response.text()
      } catch (textError) {
        responseText = 'Failed to read response body'
      }
      console.error(`[Simple Worker Test] Failed to parse response: ${responseText.substring(0, 500)}`)
      return NextResponse.json({
        success: false,
        error: 'Failed to parse worker response',
        status: response.status,
        responseText: responseText.substring(0, 500)
      })
    }
    
    return NextResponse.json({
      success: true,
      message: 'Successfully called worker API',
      workerUrl,
      status: response.status,
      result
    })
    
  } catch (error) {
    console.error('[Simple Worker Test] Error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * Test POST to worker API
 */
export async function POST(request: NextRequest) {
  try {
    // Get the current request URL to ensure we call the same deployment
    const requestUrl = new URL(request.url)
    const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`
    const workerUrl = `${baseUrl}/api/worker/shopify`
    
    console.log(`[Simple Worker Test POST] Calling worker at: ${workerUrl}`)
    
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
    
    console.log(`[Simple Worker Test POST] Response status: ${response.status}`)
    
    let result
    let responseText = ''
    
    try {
      // Clone response first to avoid "Body has already been consumed"
      const responseClone = response.clone()
      result = await response.json()
    } catch (parseError) {
      try {
        responseText = await response.text()
      } catch (textError) {
        responseText = 'Failed to read response body'
      }
      console.error(`[Simple Worker Test POST] Failed to parse response: ${responseText.substring(0, 500)}`)
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
    console.error('[Simple Worker Test POST] Error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
