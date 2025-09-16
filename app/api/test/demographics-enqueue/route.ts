/**
 * Test endpoint to verify demographics sync returns 202 quickly
 */

import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { brandId } = await request.json()
    
    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID required' }, { status: 400 })
    }

    const startTime = Date.now()
    
    // Call the demographics sync endpoint
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://www.brezmarketingdashboard.com'}/api/meta/demographics/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || ''
      },
      body: JSON.stringify({
        brandId,
        action: 'start_full_sync'
      })
    })

    const endTime = Date.now()
    const duration = endTime - startTime
    const result = await response.json()

    return NextResponse.json({
      success: true,
      responseTime: `${duration}ms`,
      status: response.status,
      wasQuick: duration < 2000, // Should be under 2 seconds
      result
    })

  } catch (error) {
    return NextResponse.json({
      error: 'Test failed',
      details: error.message
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'POST to this endpoint with { "brandId": "your-brand-id" } to test demographics sync speed'
  })
}
