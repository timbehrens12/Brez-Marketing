import { z } from 'zod'
import { NextResponse } from 'next/server'

// Common validation schemas
export const brandIdSchema = z.string().uuid('Invalid brand ID format')
export const userIdSchema = z.string().min(1, 'User ID is required')
export const dateRangeSchema = z.object({
  from: z.string().datetime('Invalid from date format'),
  to: z.string().datetime('Invalid to date format')
}).optional()

// API request validation schemas
export const aiReportRequestSchema = z.object({
  brandId: brandIdSchema,
  forceRegenerate: z.boolean().optional().default(false),
  userTimezone: z.string().optional()
})

export const leadGenerationRequestSchema = z.object({
  businessType: z.string().min(1, 'Business type is required'),
  niches: z.array(z.string()).min(1, 'At least one niche is required').max(5, 'Maximum 5 niches allowed'),
  location: z.object({
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    country: z.string().optional(),
    radius: z.string().optional()
  }),
  brandId: z.string().uuid('Invalid brand ID format').optional(),
  userId: userIdSchema,
  localDate: z.string().min(1, 'Local date is required'),
  localStartOfDayUTC: z.string().min(1, 'Local start of day UTC is required')
})

export const campaignRecommendationRequestSchema = z.object({
  brandId: brandIdSchema,
  campaignId: z.string().min(1, 'Campaign ID is required'),
  forceRegenerate: z.boolean().optional().default(false),
  userTimezone: z.string().optional()
})

export const metaMetricsRequestSchema = z.object({
  brandId: brandIdSchema,
  from: z.string().optional(),
  to: z.string().optional(),
  connectionId: z.string().uuid().optional(),
  bypass_cache: z.string().optional(),
  refresh: z.string().optional()
})

// Input sanitization functions
export function sanitizeString(input: string, maxLength: number = 1000): string {
  if (typeof input !== 'string') return ''
  
  return input
    .trim()
    .slice(0, maxLength)
    // Remove potential script tags and HTML
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    // Remove SQL injection patterns
    .replace(/('|(\\')|(\\\\)|(\\))/g, '')
    // Remove potential XSS patterns
    .replace(/(javascript:|data:|vbscript:|onload=|onerror=)/gi, '')
}

export function sanitizeAIInput(input: string): string {
  if (typeof input !== 'string') return ''
  
  return input
    .trim()
    .slice(0, 10000) // Limit AI input length
    // Remove prompt injection attempts
    .replace(/(\n\s*)(ignore|forget|disregard|override)[\s\w]*previous[\s\w]*instructions?/gi, '')
    .replace(/(\n\s*)(act|behave|pretend|roleplay)\s+as\s+/gi, '')
    .replace(/(\n\s*)(system|admin|root|developer)\s*(message|prompt|instruction)/gi, '')
    // Remove potential code injection
    .replace(/`{3,}[\w]*\n[\s\S]*?\n`{3,}/g, '')
    .replace(/\{\{[\s\S]*?\}\}/g, '')
}

// Validation wrapper function
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): T | NextResponse {
  try {
    return schema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }))
      
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: errors,
          timestamp: new Date().toISOString()
        }, 
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { 
        error: 'Invalid request format',
        timestamp: new Date().toISOString() 
      }, 
      { status: 400 }
    )
  }
}

// Rate limiting check
export async function checkRateLimit(userId: string, endpoint: string, limit: number = 10, interval: number = 60) {
  const { rateLimiter } = await import('@/lib/rate-limiter')
  
  const result = await rateLimiter.limit(
    `${endpoint}:${userId}`,
    { interval, limit }
  )
  
  if (!result.success) {
    return NextResponse.json(
      { 
        error: 'Rate limit exceeded',
        retryAfter: result.retryAfter,
        timestamp: new Date().toISOString()
      }, 
      { 
        status: 429,
        headers: {
          'Retry-After': result.retryAfter?.toString() || '60',
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': result.remaining.toString()
        }
      }
    )
  }
  
  return null // No rate limit exceeded
}

// Security headers for API responses
export function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
  
  return response
}
