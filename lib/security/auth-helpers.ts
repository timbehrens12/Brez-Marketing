import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'
import { enforceRateLimit, createSecureResponse, validateUUID } from './middleware'

/**
 * Enhanced authentication wrapper for API routes
 * Provides comprehensive security checks including:
 * - User authentication
 * - Brand ownership validation
 * - Rate limiting
 * - Input sanitization
 */
export async function withSecureAuth<T>(
  request: NextRequest,
  handler: (params: {
    userId: string
    brandId?: string
    supabase: ReturnType<typeof createClient>
    request: NextRequest
  }) => Promise<NextResponse>,
  options: {
    requireBrandAccess?: boolean
    rateLimitTier?: 'low' | 'medium' | 'high' | 'critical'
    endpoint: string
  }
): Promise<NextResponse> {
  try {
    // 1. Authentication check
    const { userId } = auth()
    if (!userId) {
      return createSecureResponse({ error: 'Authentication required' }, 401)
    }

    // 2. Rate limiting
    if (options.rateLimitTier) {
      const rateLimitResult = await enforceRateLimit(userId, options.endpoint, options.rateLimitTier)
      if (rateLimitResult) return rateLimitResult
    }

    // 3. Brand access validation if required
    let brandId: string | undefined
    if (options.requireBrandAccess) {
      const url = new URL(request.url)
      brandId = url.searchParams.get('brandId') || 
                (request.method === 'POST' ? await getBrandIdFromBody(request) : undefined)
      
      if (!brandId) {
        return createSecureResponse({ error: 'Brand ID required' }, 400)
      }

      if (!validateUUID(brandId)) {
        return createSecureResponse({ error: 'Invalid brand ID format' }, 400)
      }

      // Brand ownership will be validated by RLS policies
    }

    // 4. Create authenticated Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${await getClerkToken()}`
          }
        }
      }
    )

    // 5. Call the actual handler
    return await handler({ userId, brandId, supabase, request })

  } catch (error) {
    console.error('Security wrapper error:', error)
    return createSecureResponse(
      { error: 'Internal security error' },
      500
    )
  }
}

/**
 * Secure webhook handler with signature verification
 */
export async function withSecureWebhook(
  request: NextRequest,
  handler: (params: {
    body: any
    rawBody: string
    request: NextRequest
  }) => Promise<NextResponse>,
  options: {
    secretEnvVar: string
    signatureHeader: string
    algorithm?: 'sha256' | 'sha1'
    requiredHeaders?: string[]
  }
): Promise<NextResponse> {
  try {
    // 1. Check required headers
    if (options.requiredHeaders) {
      for (const header of options.requiredHeaders) {
        if (!request.headers.get(header)) {
          console.warn(`🚨 SECURITY: Missing required header: ${header}`)
          return createSecureResponse({ error: 'Missing required headers' }, 401)
        }
      }
    }

    // 2. Get signature
    const signature = request.headers.get(options.signatureHeader)
    if (!signature) {
      console.warn(`🚨 SECURITY: Missing webhook signature`)
      return createSecureResponse({ error: 'Missing signature' }, 401)
    }

    // 3. Get webhook secret
    const secret = process.env[options.secretEnvVar]
    if (!secret) {
      console.error(`🚨 SECURITY: Missing webhook secret: ${options.secretEnvVar}`)
      return createSecureResponse({ error: 'Server configuration error' }, 500)
    }

    // 4. Get raw body for signature verification
    const rawBody = await request.text()
    
    // 5. Verify signature
    const crypto = await import('crypto')
    const expectedSignature = crypto
      .createHmac(options.algorithm || 'sha256', secret)
      .update(rawBody, 'utf8')
      .digest('base64')
    
    if (!crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature))) {
      console.warn(`🚨 SECURITY: Invalid webhook signature`)
      return createSecureResponse({ error: 'Invalid signature' }, 401)
    }

    // 6. Parse body
    let body: any
    try {
      body = JSON.parse(rawBody)
    } catch (error) {
      return createSecureResponse({ error: 'Invalid JSON payload' }, 400)
    }

    // 7. Call handler
    return await handler({ body, rawBody, request })

  } catch (error) {
    console.error('Webhook security error:', error)
    return createSecureResponse({ error: 'Webhook processing failed' }, 500)
  }
}

// Helper functions
async function getBrandIdFromBody(request: NextRequest): Promise<string | undefined> {
  try {
    const clone = request.clone()
    const body = await clone.json()
    return body.brandId
  } catch {
    return undefined
  }
}

async function getClerkToken(): Promise<string | null> {
  try {
    const { getToken } = auth()
    return await getToken({ template: 'supabase' })
  } catch {
    return null
  }
}
