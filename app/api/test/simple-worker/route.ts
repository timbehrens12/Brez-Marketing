import { NextResponse } from 'next/server'

/**
 * Simple test that calls the worker API directly
 */
export async function GET() {
  try {
    // Get the base URL
    let baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000'
    
    // Ensure VERCEL_URL has protocol
    if (process.env.VERCEL_URL && !baseUrl.startsWith('http')) {
      baseUrl = `https://${process.env.VERCEL_URL}`
    }
    
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
    try {
      result = await response.json()
    } catch (parseError) {
      const responseText = await response.clone().text()
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
export async function POST() {
  try {
    // Get the base URL
    let baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000'
    
    // Ensure VERCEL_URL has protocol
    if (process.env.VERCEL_URL && !baseUrl.startsWith('http')) {
      baseUrl = `https://${process.env.VERCEL_URL}`
    }
    
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
    try {
      result = await response.json()
    } catch (parseError) {
      const responseText = await response.clone().text()
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
