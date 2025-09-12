import { NextRequest, NextResponse } from 'next/server'

// Import the same cache object from the metrics endpoint
// Note: This is a simple approach - in production you'd use a proper cache service

export async function POST(request: NextRequest) {
  try {
    // Since we can't directly access the cache from the metrics endpoint,
    // we'll make a request with cache-busting parameters to force fresh data
    
    const url = new URL(request.url)
    const brandId = url.searchParams.get('brandId') || '5352d021-6ea8-4ef0-a63c-973978c89464'
    
    // Make multiple requests with different parameters to bust all possible cache entries
    const cacheBustingParams = [
      { bypass_cache: 'true', force_refresh: 'true', t: Date.now() },
      { bypass_cache: 'true', force_refresh: 'true', t: Date.now() + 1 },
      { bypass_cache: 'true', force_refresh: 'true', nocache: 'true', t: Date.now() + 2 }
    ]
    
    const results = []
    
    for (const params of cacheBustingParams) {
      const queryString = new URLSearchParams({
        brandId,
        ...params
      }).toString()
      
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://www.brezmarketingdashboard.com'}/api/metrics/meta?${queryString}`)
        if (response.ok) {
          const data = await response.json()
          results.push({
            params,
            adSpend: data.adSpend,
            success: true
          })
        } else {
          results.push({
            params,
            error: `HTTP ${response.status}`,
            success: false
          })
        }
      } catch (error) {
        results.push({
          params,
          error: error instanceof Error ? error.message : 'Unknown error',
          success: false
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Cache busting requests sent',
      brandId,
      results
    })

  } catch (error) {
    console.error('Error in clear-cache:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 })
  }
}
