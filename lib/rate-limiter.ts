import { Redis } from '@upstash/redis';

// Upstash Redis client initialization
let redis: Redis | null = null;

try {
  // Check for Upstash REST API format first
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  } 
  // Fall back to standard Redis config (construct REST URL from host/password)
  else if (process.env.REDIS_HOST && process.env.REDIS_PASSWORD) {
    const redisHost = process.env.REDIS_HOST.replace('https://', '').replace('http://', '');
    redis = new Redis({
      url: `https://${redisHost}`,
      token: process.env.REDIS_PASSWORD,
    });
    console.log('[Rate Limiter] Using Redis config from REDIS_HOST/REDIS_PASSWORD');
  } else {
    console.warn('[Rate Limiter] No Redis config found, using memory cache only');
  }
} catch (error) {
  console.error('Failed to initialize Redis client for rate limiting:', error);
}

interface RateLimitOptions {
  interval: number; // in seconds
  limit: number;
  uniqueTokenPerInterval?: number;
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  retryAfter?: number; // seconds until retry is allowed
}

/**
 * A simple rate limiter using Redis or in-memory fallback
 */
class RateLimiter {
  private cache = new Map<string, { count: number; reset: number }>();

  /**
   * Check if a request should be rate limited
   * @param key - Unique identifier for the rate limit (e.g. 'api:user:123')
   * @param options - Rate limit options
   * @returns Rate limit result with success status and remaining tokens
   */
  async limit(key: string, options: RateLimitOptions): Promise<RateLimitResult> {
    const { interval, limit, uniqueTokenPerInterval = 100 } = options;
    const now = Math.floor(Date.now() / 1000);

    // Try to use Redis for distributed rate limiting if available
    if (redis) {
      try {
        // Use Redis for distributed rate limiting
        const tokenKey = `ratelimit:${key}`;
        
        // Get the current count and reset time
        const [count, reset] = await redis.pipeline()
          .incr(tokenKey)
          .ttl(tokenKey)
          .exec() as [number, number];
        
        // If this is the first request in this interval, set an expiration
        if (count === 1) {
          await redis.expire(tokenKey, interval);
        }
        
        const remaining = Math.max(0, limit - count);
        const success = count <= limit;
        
        // Calculate when the rate limit resets
        const resetTime = reset >= 0 ? reset : interval;
        
        return {
          success,
          limit,
          remaining,
          retryAfter: success ? undefined : resetTime,
        };
      } catch (error) {
        console.error('Redis rate limiting error, falling back to memory cache:', error);
        // Fall back to in-memory rate limiting
      }
    }

    // In-memory fallback rate limiting
    if (!this.cache.has(key)) {
      this.cache.set(key, {
        count: 0,
        reset: now + interval,
      });

      // Clean up expired entries periodically
      setTimeout(() => {
        this.cache.delete(key);
      }, interval * 1000);
    }

    const entry = this.cache.get(key)!;
    
    // Reset counter if the time has expired
    if (entry.reset <= now) {
      entry.count = 0;
      entry.reset = now + interval;
    }

    // Increment the count
    entry.count += 1;
    
    const remaining = Math.max(0, limit - entry.count);
    const success = entry.count <= limit;
    const retryAfter = success ? undefined : entry.reset - now;

    return {
      success,
      limit,
      remaining,
      retryAfter,
    };
  }
}

export const rateLimiter = new RateLimiter(); 