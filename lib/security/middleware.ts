import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { rateLimiter } from '@/lib/rate-limiter'
import { sanitizeString, sanitizeAIInput } from '@/lib/utils/validation'
import crypto from 'crypto'

// Production environment protection
export function enforceProduction(request: NextRequest): NextResponse | null {
  if (process.env.NODE_ENV === 'production') {
    const url = new URL(request.url)
    
    // Block debug endpoints in production
    if (url.pathname.startsWith('/api/debug/') || 
        url.pathname.startsWith('/api/sql/') ||
        url.pathname === '/api/clear-data') {
      console.warn(`🚨 SECURITY: Blocked access to ${url.pathname} in production`)
      return NextResponse.json(
        { error: 'Endpoint not available in production' }, 
        { status: 403 }
      )
    }
  }
  return null
}

// Enhanced authentication check with brand access control
export async function enforceAuthentication(
  request: NextRequest, 
  requireBrandAccess: boolean = false
): Promise<{ response?: NextResponse; userId?: string; brandId?: string }> {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return {
        response: NextResponse.json(
          { error: 'Authentication required' }, 
          { status: 401 }
        )
      }
    }

    // If brand access is required, validate brand ownership
    if (requireBrandAccess) {
      const url = new URL(request.url)
      const brandId = url.searchParams.get('brandId') || 
                     (request.method === 'POST' ? await getBrandIdFromBody(request) : null)
      
      if (!brandId) {
        return {
          response: NextResponse.json(
            { error: 'Brand ID required' }, 
            { status: 400 }
          )
        }
      }

      // Validate brand access (will be implemented with RLS)
      const hasAccess = await validateBrandAccess(userId, brandId)
      if (!hasAccess) {
        return {
          response: NextResponse.json(
            { error: 'Unauthorized brand access' }, 
            { status: 403 }
          )
        }
      }

      return { userId, brandId }
    }

    return { userId }
  } catch (error) {
    console.error('Authentication error:', error)
    return {
      response: NextResponse.json(
        { error: 'Authentication failed' }, 
        { status: 500 }
      )
    }
  }
}

// Rate limiting enforcement
export async function enforceRateLimit(
  userId: string, 
  endpoint: string, 
  tier: 'low' | 'medium' | 'high' | 'critical' = 'medium'
): Promise<NextResponse | null> {
  const limits = {
    low: { limit: 100, interval: 60 },      // 100/min for basic endpoints
    medium: { limit: 30, interval: 60 },    // 30/min for data endpoints  
    high: { limit: 10, interval: 60 },      // 10/min for AI endpoints
    critical: { limit: 5, interval: 300 }   // 5/5min for sensitive ops
  }

  const { limit, interval } = limits[tier]
  
  const result = await rateLimiter.limit(
    `${endpoint}:${userId}`,
    { interval, limit }
  )
  
  if (!result.success) {
    console.warn(`🚨 RATE LIMIT: User ${userId} exceeded ${endpoint} limit`)
    return NextResponse.json(
      { 
        error: 'Rate limit exceeded',
        retryAfter: result.retryAfter,
        limit: result.limit,
        remaining: result.remaining
      }, 
      { 
        status: 429,
        headers: {
          'Retry-After': result.retryAfter?.toString() || '60',
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': (Date.now() + (result.retryAfter || 60) * 1000).toString()
        }
      }
    )
  }
  
  return null
}

// Input validation and sanitization
export function validateAndSanitizeInput(data: any, isAIInput: boolean = false): any {
  if (typeof data === 'string') {
    return isAIInput ? sanitizeAIInput(data) : sanitizeString(data)
  }
  
  if (Array.isArray(data)) {
    return data.map(item => validateAndSanitizeInput(item, isAIInput))
  }
  
  if (data && typeof data === 'object') {
    const sanitized: any = {}
    for (const [key, value] of Object.entries(data)) {
      // Sanitize key names too
      const sanitizedKey = sanitizeString(key, 100)
      sanitized[sanitizedKey] = validateAndSanitizeInput(value, isAIInput)
    }
    return sanitized
  }
  
  return data
}

// Webhook signature verification
export function verifyWebhookSignature(
  rawBody: string, 
  signature: string, 
  secret: string,
  algorithm: 'sha256' | 'sha1' = 'sha256'
): boolean {
  try {
    const expectedSignature = crypto
      .createHmac(algorithm, secret)
      .update(rawBody, 'utf8')
      .digest('base64')
    
    // Use timing-safe comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(signature)
    )
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    return false
  }
}

// UUID validation to prevent enumeration
export function validateUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

// Helper functions
async function getBrandIdFromBody(request: NextRequest): Promise<string | null> {
  try {
    const clone = request.clone()
    const body = await clone.json()
    return body.brandId || null
  } catch {
    return null
  }
}

async function validateBrandAccess(userId: string, brandId: string): Promise<boolean> {
  // This will be enforced by RLS policies in Supabase
  // For now, return true as RLS will handle the actual validation
  return true
}

// Security response wrapper
export function createSecureResponse(data: any, status: number = 200): NextResponse {
  const response = NextResponse.json({
    ...data,
    timestamp: new Date().toISOString(),
    requestId: crypto.randomUUID()
  }, { status })
  
  // Add security headers
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
  response.headers.set('X-Robots-Tag', 'noindex, nofollow')
  
  return response
}

// Environment validation
export function validateEnvironment(): void {
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    'CLERK_SECRET_KEY'
  ]
  
  const missing = requiredEnvVars.filter(env => !process.env[env])
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
}
