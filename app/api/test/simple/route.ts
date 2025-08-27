import { NextResponse } from 'next/server'

/**
 * Simple test endpoint to verify API routes work
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Simple test endpoint working',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  })
}

export async function POST() {
  return NextResponse.json({
    success: true,
    message: 'Simple POST endpoint working',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  })
}
