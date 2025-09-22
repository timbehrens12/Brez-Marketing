/**
 * Production-ready Meta API wrapper with built-in rate limiting
 * Use this instead of direct fetch() calls to Meta APIs
 */

import RateLimitHandler from './rate-limit-handler'

interface MetaAPIOptions {
  brandId: string
  endpoint: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: any
  headers?: Record<string, string>
  timeout?: number
  retries?: number
  skipRateLimit?: boolean // Only for emergency use
}

interface MetaAPIResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  rateLimited?: boolean
  retryAfter?: number
}

export class MetaAPIWrapper {
  static async call<T = any>(options: MetaAPIOptions): Promise<MetaAPIResponse<T>> {
    const {
      brandId,
      endpoint,
      method = 'GET',
      body,
      headers = {},
      timeout = 10000,
      retries = 1,
      skipRateLimit = false
    } = options

    // Check rate limits first (unless skipped)
    if (!skipRateLimit) {
      const rateLimitCheck = RateLimitHandler.canMakeRequest(brandId)
      if (!rateLimitCheck.allowed) {
        console.warn(`[MetaAPI] Request blocked: ${rateLimitCheck.reason}`)
        return {
          success: false,
          error: rateLimitCheck.reason,
          rateLimited: true,
          retryAfter: Math.ceil(rateLimitCheck.waitTime / 1000)
        }
      }
    }

    // Record the request attempt
    if (!skipRateLimit) {
      RateLimitHandler.recordRequest(brandId)
    }

    // Build request
    const requestOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      signal: AbortSignal.timeout(timeout)
    }

    if (body && method !== 'GET') {
      requestOptions.body = JSON.stringify(body)
    }

    // Add cache busting for GET requests to ensure fresh data
    let url = endpoint
    if (method === 'GET' && !url.includes('?')) {
      url += `?_t=${Date.now()}`
    } else if (method === 'GET') {
      url += `&_t=${Date.now()}`
    }

    console.log(`[MetaAPI] ${method} ${url} (Brand: ${brandId})`)

    let lastError: any = null

    // Retry logic
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, requestOptions)
        const responseData = await response.json()

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${responseData.error || response.statusText}`)
        }

        console.log(`[MetaAPI] ✅ Success on attempt ${attempt}/${retries}`)
        return {
          success: true,
          data: responseData
        }

      } catch (error: any) {
        lastError = error
        console.warn(`[MetaAPI] ❌ Attempt ${attempt}/${retries} failed:`, error.message)

        // Check if this is a rate limit error
        if (RateLimitHandler.isMetaRateLimitError(error)) {
          const retryAfter = RateLimitHandler.extractRetryAfter(error)
          RateLimitHandler.recordRateLimit(brandId, retryAfter)
          
          return {
            success: false,
            error: 'Rate limit exceeded',
            rateLimited: true,
            retryAfter: retryAfter || 300 // Default 5 minutes
          }
        }

        // If this is the last attempt, don't wait
        if (attempt === retries) {
          break
        }

        // Exponential backoff for retries (but not for rate limits)
        const backoffTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000)
        console.log(`[MetaAPI] Waiting ${backoffTime}ms before retry ${attempt + 1}`)
        await new Promise(resolve => setTimeout(resolve, backoffTime))
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Request failed after all retries'
    }
  }

  // Convenience methods for common operations
  static async get<T>(endpoint: string, brandId: string, options?: Partial<MetaAPIOptions>): Promise<MetaAPIResponse<T>> {
    return this.call<T>({
      brandId,
      endpoint,
      method: 'GET',
      ...options
    })
  }

  static async post<T>(endpoint: string, brandId: string, body: any, options?: Partial<MetaAPIOptions>): Promise<MetaAPIResponse<T>> {
    return this.call<T>({
      brandId,
      endpoint,
      method: 'POST',
      body,
      ...options
    })
  }

  // Get current rate limit status for a brand
  static getRateLimitStatus(brandId: string) {
    return RateLimitHandler.getStatus(brandId)
  }

  // Force wait for rate limit to clear (use sparingly)
  static async waitForRateLimit(brandId: string): Promise<void> {
    await RateLimitHandler.waitForAvailability(brandId)
  }
}

export default MetaAPIWrapper
