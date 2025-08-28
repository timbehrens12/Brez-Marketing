import { NextResponse } from 'next/server'

// Simplest possible endpoint - no imports, no auth, nothing
export async function GET() {
  console.log('[TEST SIMPLE] GET request received')
  return NextResponse.json({ 
    status: 'ok', 
    message: 'Simple test endpoint working',
    timestamp: new Date().toISOString()
  })
}

export async function POST() {
  console.log('[TEST SIMPLE] POST request received')
  return NextResponse.json({ 
    status: 'ok', 
    message: 'Simple test POST working',
    timestamp: new Date().toISOString()
  })
}
