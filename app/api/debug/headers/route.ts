import { NextRequest, NextResponse } from 'next/server'

/**
 * Debug endpoint to check headers
 */
export async function GET(request: NextRequest) {
  const headers: Record<string, string> = {}
  
  request.headers.forEach((value, key) => {
    headers[key] = value
  })
  
  return NextResponse.json({
    success: true,
    message: 'Headers debug endpoint',
    headers,
    internalCall: request.headers.get('x-internal-call'),
    userAgent: request.headers.get('user-agent'),
    authorization: request.headers.get('authorization')
  })
}

export async function POST(request: NextRequest) {
  const headers: Record<string, string> = {}
  
  request.headers.forEach((value, key) => {
    headers[key] = value
  })
  
  return NextResponse.json({
    success: true,
    message: 'Headers debug endpoint (POST)',
    headers,
    internalCall: request.headers.get('x-internal-call'),
    userAgent: request.headers.get('user-agent'),
    authorization: request.headers.get('authorization')
  })
}
