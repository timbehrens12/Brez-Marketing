import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const params = {
    maxJobs: url.searchParams.get('maxJobs'),
    action: url.searchParams.get('action'),
    brandId: url.searchParams.get('brandId'),
    allParams: Object.fromEntries(url.searchParams.entries())
  }

  console.log('[Test Params] Received params:', params)

  return NextResponse.json({
    success: true,
    params,
    timestamp: new Date().toISOString()
  })
}
