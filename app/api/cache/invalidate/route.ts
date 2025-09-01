import { NextRequest, NextResponse } from 'next/server'

// Simple in-memory cache store (shared with other API routes)
declare global {
  var apiCache: Map<string, any> | undefined
}

// Initialize global cache if it doesn't exist
if (!global.apiCache) {
  global.apiCache = new Map()
}

const apiCache = global.apiCache

export async function POST(request: NextRequest) {
  try {
    // Check if this is an automated call from our sync services
    const userAgent = request.headers.get('user-agent')
    const isAutomated = userAgent === 'Brez-Daily-Sync' || userAgent === 'Brez-Midday-Refresh' || userAgent === 'Brez-Cache-Invalidator'
    
    // For security, only allow automated calls or requests with proper auth
    if (!isAutomated) {
      const authHeader = request.headers.get('authorization')
      if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        console.log('Unauthorized cache invalidation attempt')
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const body = await request.json()
    const { brandId, type, reason, pattern } = body

    if (!brandId && !pattern) {
      return NextResponse.json({ error: 'Brand ID or pattern is required' }, { status: 400 })
    }

    console.log(`[Cache Invalidation] Starting invalidation:`, { brandId, type, reason, pattern })

    let invalidatedKeys = 0
    const cacheKeys = Array.from(apiCache.keys())

    // If pattern is provided, use it to match keys
    if (pattern) {
      const regex = new RegExp(pattern)
      for (const key of cacheKeys) {
        if (regex.test(key)) {
          apiCache.delete(key)
          invalidatedKeys++
          console.log(`[Cache Invalidation] Removed key by pattern: ${key}`)
        }
      }
    } else {
      // Invalidate specific brand caches
      for (const key of cacheKeys) {
        let shouldDelete = false

        // Check if this cache key belongs to the specified brand
        if (key.includes(`-${brandId}-`)) {
          if (!type) {
            // No specific type, invalidate all for this brand
            shouldDelete = true
          } else if (type === 'meta' && key.includes('meta-metrics')) {
            // Invalidate Meta metrics caches
            shouldDelete = true
          } else if (type === 'shopify' && key.includes('shopify')) {
            // Invalidate Shopify caches
            shouldDelete = true
          }
        }

        if (shouldDelete) {
          apiCache.delete(key)
          invalidatedKeys++
          console.log(`[Cache Invalidation] Removed key: ${key}`)
        }
      }
    }

    console.log(`[Cache Invalidation] Completed: ${invalidatedKeys} keys invalidated for brand ${brandId}${type ? ` (${type})` : ''} - ${reason}`)

    return NextResponse.json({ 
      success: true, 
      invalidatedKeys,
      reason,
      brandId,
      type
    })

  } catch (error) {
    console.error('[Cache Invalidation] Error:', error)
    return NextResponse.json({ 
      error: 'Failed to invalidate cache',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 