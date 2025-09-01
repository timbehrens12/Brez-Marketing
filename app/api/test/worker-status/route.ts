import { NextResponse } from 'next/server'

/**
 * Simple status check for worker API
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Worker status test endpoint',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    vercelUrl: process.env.VERCEL_URL,
    nextAuthUrl: process.env.NEXTAUTH_URL
  })
}

export async function POST() {
  return NextResponse.json({
    success: true,
    message: 'Worker status test endpoint (POST)',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    auth_disabled: true,
    note: 'This endpoint has no auth checks - should always work'
  })
}
