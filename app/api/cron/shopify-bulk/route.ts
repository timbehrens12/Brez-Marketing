import { NextRequest, NextResponse } from 'next/server'

// Cron job endpoint for processing Shopify bulk operations
// This should be called every few minutes by your deployment platform's cron service
// For Vercel: Configure in vercel.json
// For other platforms: Set up external cron to call this endpoint

export async function GET(request: NextRequest) {
  try {
    // Verify this is coming from a trusted source (optional but recommended)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    console.log('[Cron] Starting Shopify bulk job processing...')
    
    // Import and call the bulk processor
    const processResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/shopify/bulk/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    const result = await processResponse.json()
    
    if (!processResponse.ok) {
      console.error('[Cron] Bulk processing failed:', result)
      return NextResponse.json({ 
        success: false, 
        error: result.error 
      }, { status: 500 })
    }
    
    console.log('[Cron] Bulk processing completed:', result)
    
    return NextResponse.json({
      success: true,
      message: 'Bulk job processing completed',
      stats: result.stats,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('[Cron] Error in bulk job cron:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// Also allow POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request)
}
