/**
 * Production-ready rate limit handler for Meta API
 * Prevents excessive API calls and handles rate limits gracefully
 */

interface RateLimitState {
  isRateLimited: boolean
  retryAfter: number
  lastRequest: number
  requestCount: number
  windowStart: number
}

// Global rate limit state per brand
const rateLimitStates = new Map<string, RateLimitState>()

// Rate limit configuration
const RATE_LIMIT_CONFIG = {
  // Maximum requests per minute per brand
  MAX_REQUESTS_PER_MINUTE: 30,
  // Minimum time between requests (in ms)
  MIN_REQUEST_INTERVAL: 2000, // 2 seconds between requests
  // How long to back off when rate limited (in ms)
  RATE_LIMIT_BACKOFF: 300000, // 5 minutes
  // Window size for tracking requests (in ms)
  WINDOW_SIZE: 60000, // 1 minute
}

export class RateLimitHandler {
  static getBrandState(brandId: string): RateLimitState {
    if (!rateLimitStates.has(brandId)) {
      rateLimitStates.set(brandId, {
        isRateLimited: false,
        retryAfter: 0,
        lastRequest: 0,
        requestCount: 0,
        windowStart: Date.now(),
      })
    }
    return rateLimitStates.get(brandId)!
  }

  static canMakeRequest(brandId: string): { allowed: boolean; waitTime: number; reason?: string } {
    const state = this.getBrandState(brandId)
    const now = Date.now()

    // Check if still in rate limit period
    if (state.isRateLimited && now < state.retryAfter) {
      return {
        allowed: false,
        waitTime: state.retryAfter - now,
        reason: `Rate limited. Wait ${Math.ceil((state.retryAfter - now) / 1000)}s`
      }
    }

    // Reset rate limit if backoff period has passed
    if (state.isRateLimited && now >= state.retryAfter) {
      state.isRateLimited = false
      state.requestCount = 0
      state.windowStart = now
    }

    // Check minimum interval between requests
    const timeSinceLastRequest = now - state.lastRequest
    if (timeSinceLastRequest < RATE_LIMIT_CONFIG.MIN_REQUEST_INTERVAL) {
      return {
        allowed: false,
        waitTime: RATE_LIMIT_CONFIG.MIN_REQUEST_INTERVAL - timeSinceLastRequest,
        reason: `Too frequent. Wait ${Math.ceil((RATE_LIMIT_CONFIG.MIN_REQUEST_INTERVAL - timeSinceLastRequest) / 1000)}s`
      }
    }

    // Reset window if it has expired
    if (now - state.windowStart > RATE_LIMIT_CONFIG.WINDOW_SIZE) {
      state.requestCount = 0
      state.windowStart = now
    }

    // Check requests per minute limit
    if (state.requestCount >= RATE_LIMIT_CONFIG.MAX_REQUESTS_PER_MINUTE) {
      const waitTime = RATE_LIMIT_CONFIG.WINDOW_SIZE - (now - state.windowStart)
      return {
        allowed: false,
        waitTime,
        reason: `Request limit exceeded. Wait ${Math.ceil(waitTime / 1000)}s`
      }
    }

    return { allowed: true, waitTime: 0 }
  }

  static recordRequest(brandId: string) {
    const state = this.getBrandState(brandId)
    const now = Date.now()

    state.lastRequest = now
    state.requestCount++

    console.log(`[RateLimit] Brand ${brandId}: ${state.requestCount}/${RATE_LIMIT_CONFIG.MAX_REQUESTS_PER_MINUTE} requests in current window`)
  }

  static recordRateLimit(brandId: string, retryAfterSeconds?: number) {
    const state = this.getBrandState(brandId)
    const now = Date.now()

    state.isRateLimited = true
    state.retryAfter = now + (retryAfterSeconds ? retryAfterSeconds * 1000 : RATE_LIMIT_CONFIG.RATE_LIMIT_BACKOFF)

    console.warn(`[RateLimit] Brand ${brandId} rate limited until ${new Date(state.retryAfter).toISOString()}`)

    // Show user-friendly notification
    if (typeof window !== 'undefined') {
      // Dynamic import to avoid SSR issues
      import('sonner').then(({ toast }) => {
        toast.warning(`Meta API rate limit reached. Data refresh paused for ${Math.ceil((state.retryAfter - now) / 60000)} minutes.`, {
          duration: 10000,
          description: 'This protects your account from being blocked. Data will refresh automatically when the limit resets.'
        })
      })
    }
  }

  static async waitForAvailability(brandId: string): Promise<void> {
    const check = this.canMakeRequest(brandId)
    if (check.allowed) {
      return
    }

    console.log(`[RateLimit] Waiting ${check.waitTime}ms for brand ${brandId}: ${check.reason}`)
    await new Promise(resolve => setTimeout(resolve, check.waitTime))
  }

  static isMetaRateLimitError(error: any): boolean {
    if (!error) return false

    // Check error message patterns
    const errorMsg = error.message || error.toString() || ''
    const rateLimitPatterns = [
      'User request limit reached',
      'rate limited',
      'Too many calls',
      'API rate limit',
      'Request limit exceeded',
      'code 17', // Meta's rate limit error code
      'subcode 2446079' // Meta's rate limit subcode
    ]

    return rateLimitPatterns.some(pattern => 
      errorMsg.toLowerCase().includes(pattern.toLowerCase())
    )
  }

  static extractRetryAfter(error: any): number | undefined {
    const errorMsg = error.message || error.toString() || ''
    
    // Look for "Wait Xs" pattern
    const waitMatch = errorMsg.match(/Wait (\d+)s/i)
    if (waitMatch) {
      return parseInt(waitMatch[1], 10)
    }

    // Look for retry-after header if available
    if (error.response?.headers?.['retry-after']) {
      return parseInt(error.response.headers['retry-after'], 10)
    }

    return undefined
  }

  static getStatus(brandId: string) {
    const state = this.getBrandState(brandId)
    const now = Date.now()

    return {
      isRateLimited: state.isRateLimited && now < state.retryAfter,
      requestCount: state.requestCount,
      maxRequests: RATE_LIMIT_CONFIG.MAX_REQUESTS_PER_MINUTE,
      timeUntilReset: state.isRateLimited ? Math.max(0, state.retryAfter - now) : 0,
      windowTimeLeft: Math.max(0, RATE_LIMIT_CONFIG.WINDOW_SIZE - (now - state.windowStart))
    }
  }
}

// Export for use in API routes and components
export default RateLimitHandler
