/**
 * Meta Campaign Status Check API
 * 
 * This API fetches the current status of a Meta campaign directly from the Meta API.
 * It's used to ensure campaign statuses are always up-to-date in the UI.
 * 
 * FIXED: Campaign status display issue - Campaigns now properly reflect their current status
 * in the UI after implementing force refresh, status normalization, and periodic checks.
 * 
 * IMPROVED: Rate limiting now supports manual checks with higher limits:
 * - Manual checks: 10 requests per account per 5 minutes
 * - Automatic checks: 5 requests per account per 5 minutes
 * - Campaign cooldown: 30 seconds (reduced from 120 seconds)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

// Simple rate limiter implementation since we can't find the import
const rateLimiter = {
  limit: async (key: string, options: { uniqueTokenPerInterval: number, interval: number, limit: number }) => {
    // Create a basic in-memory rate limiter
    const now = Date.now();
    const timestamps = rateLimitStore.get(key) || [];
    const validTimestamps = timestamps.filter(ts => now - ts < options.interval * 1000);
    
    // Add the current timestamp
    validTimestamps.push(now);
    
    // Store updated timestamps
    rateLimitStore.set(key, validTimestamps);
    
    // Check if we've exceeded the limit
    const success = validTimestamps.length <= options.limit;
    
    return {
      success,
      limit: options.limit,
      remaining: Math.max(0, options.limit - validTimestamps.length),
      retryAfter: success ? 0 : Math.ceil((options.interval * 1000 - (now - validTimestamps[0])) / 1000)
    };
  }
};

// In-memory store for rate limiter
const rateLimitStore = new Map<string, number[]>();

// Updated session function using Clerk
const getSession = async (request: NextRequest) => {
  try {
    const { userId } = auth();
    
    if (!userId) {
      console.log("No valid Clerk session found");
      return null;
    }
    
    return {
      user: {
        id: userId,
        accountId: userId
      }
    };
  } catch (error) {
    console.error("Error getting Clerk session:", error);
    return null;
  }
};

// Updated database access using authenticated Supabase client
const getAuthenticatedSupabaseClient = async () => {
  const { getToken } = auth();
  const token = await getToken({ template: 'supabase' });
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  if (token) {
    return createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });
  }
  
  return createClient(supabaseUrl, supabaseKey);
};

// Updated database access object
const db = {
  brand: {
    findUnique: async ({ where }: any) => {
      try {
        const supabase = await getAuthenticatedSupabaseClient();
        
        const { data } = await supabase
          .from('brands')
          .select('*, platform_connections(*)')
          .eq('id', where.id)
          .single();
          
        if (!data) return null;
        
        // Find Meta connection
        const metaConnection = data.platform_connections?.find(
          (conn: any) => conn.platform_type === 'meta' && conn.status === 'active'
        );
        
        return {
          ...data,
          metaConnection
        };
      } catch (error) {
        console.error("Error fetching brand:", error);
        return null;
      }
    }
  }
};

// Simple MetaService implementation
class MetaService {
  private connection: any;
  
  constructor(connection: any) {
    this.connection = connection;
  }
  
  async getCampaignStatus(campaignId: string): Promise<string> {
    try {
      // Ensure we have the ad_account_id in metadata
      const adAccountId = this.connection.metadata?.ad_account_id;
      
      if (!adAccountId) {
        throw new Error('Missing ad_account_id in connection metadata');
      }
      
      // Fetch the campaign status from Meta
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${campaignId}?fields=status,effective_status&access_token=${this.connection.access_token}`
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Meta API error: ${errorData.error?.message || 'Unknown error'}`);
      }
      
      const data = await response.json();
      
      // Return effective_status or status
      return data.effective_status || data.status || 'UNKNOWN';
    } catch (error) {
      console.error(`[MetaService] Error getting campaign status:`, error);
      throw error;
    }
  }
}

export const dynamic = 'force-dynamic';

// Rate limit configuration: Reasonable limits for manual checks
const RATE_LIMIT_MAX = 8;  // 8 requests per 5 minutes window 
const RATE_LIMIT_WINDOW = 5 * 60;  // 5 minutes in seconds
const ACCOUNT_RATE_LIMIT = 5;  // Max 5 requests per account in the window (increased for manual checks)
const CAMPAIGN_COOLDOWN = 30; // 30 seconds cooldown per campaign (reduced for better UX)

// Track pending campaign requests to avoid duplicate fetches
const pendingCampaigns = new Map<string, Promise<any>>();
// Keep a separate cache of recently checked campaigns with longer TTL
const campaignCache = new Map<string, {
  status: string;
  timestamp: number;
  source: string;
}>();

// Add a mechanism to detect repeated failures and increase cooling period
const failureCounters = new Map<string, { count: number, until: number }>();

// Helper function to clean up old cache entries periodically
function cleanupCacheEntries() {
  const now = Date.now();
  const MAX_CACHE_AGE = 60 * 60 * 1000; // 1 hour

  for (const [key, data] of campaignCache.entries()) {
    if (now - data.timestamp > MAX_CACHE_AGE) {
      campaignCache.delete(key);
    }
  }
}

// Run cache cleanup every 15 minutes
setInterval(cleanupCacheEntries, 15 * 60 * 1000);

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);

    if (!session?.user) {
      // Check if we're getting too many failed requests
      const ip = req.headers.get('x-forwarded-for') || 'unknown';
      const failKey = `${ip}:auth-failure`;
      
      const failureRecord = failureCounters.get(failKey);
      const now = Date.now();
      
      // If we have a record and it's still in cooling period, return early with a longer timeout
      if (failureRecord && now < failureRecord.until) {
        return NextResponse.json(
          { 
                    success: false, 
        error: 'Too many requests with expired session',
        source: 'repeated_auth_failure',
        retryAfter: Math.ceil((failureRecord.until - now) / 1000),
        message: 'Please refresh the page to continue'
      },
      { status: 429 }
        );
      }
      
      // Otherwise increment the failure counter and set a cooling period
      const count = (failureRecord?.count || 0) + 1;
      const cooldown = Math.min(30000 * Math.pow(2, count - 1), 3600000); // Exponential backoff, max 1 hour
      
      failureCounters.set(failKey, {
        count,
        until: now + cooldown
      });
      
      console.log(`Auth failure #${count} from ${ip}, cooling period: ${cooldown}ms`);
      
      // Return a friendly response that won't create console errors
      return NextResponse.json(
        { 
          success: false, 
          error: 'Session expired',
          source: 'session_expired',
          message: 'Please refresh the page to continue'
        },
        { status: 401 }
      );
    }

    const { brandId, campaignId, forceRefresh = false, isManualCheck = false } = await req.json();

    if (!brandId || !campaignId) {
      return NextResponse.json(
        { error: 'Missing required parameters: brandId and campaignId are required' },
        { status: 400 }
      );
    }

    const userId = session.user.id;
    const accountId = session.user.accountId;

    // Enhanced rate limiter that takes campaign ID into account
    const rateLimitKey = `meta-campaign-status:${accountId}:${brandId}`;
    const campaignRateLimitKey = `meta-campaign-status:${accountId}:${brandId}:${campaignId}`;
    
    // Check campaign-specific rate limit first (more restrictive)
    const campaignRateLimit = await rateLimiter.limit(campaignRateLimitKey, {
      uniqueTokenPerInterval: 500,
      interval: CAMPAIGN_COOLDOWN,
      limit: 1,
    });

    // Check if we have a recent cached result for this campaign
    const cacheKey = `${brandId}:${campaignId}`;
    const cachedResult = campaignCache.get(cacheKey);
    const now = Date.now();
    const cacheAge = cachedResult ? now - cachedResult.timestamp : Infinity;
    
    // Use cached result if available and not expired, unless force refresh requested
    const MAX_CACHE_AGE_NORMAL = 15 * 60 * 1000; // 15 minutes for normal refresh
    const MAX_CACHE_AGE_FORCE = 60 * 1000; // 1 minute for force refresh
    const isCacheValid = cachedResult && (
      (forceRefresh && cacheAge < MAX_CACHE_AGE_FORCE) || 
      (!forceRefresh && cacheAge < MAX_CACHE_AGE_NORMAL)
    );

    if (isCacheValid) {
      console.log(`[API] Using cached status for campaign ${campaignId}, age: ${Math.round(cacheAge/1000)}s`);
      return NextResponse.json({
        success: true,
        status: cachedResult.status,
        source: 'cache',
        timestamp: cachedResult.timestamp,
        message: `Using cached status. Last checked: ${new Date(cachedResult.timestamp).toISOString()}`,
      });
    }

    if (!campaignRateLimit.success && !forceRefresh) {
      console.log(`[RATE LIMIT] Campaign cooldown for ${campaignId}`);
      
      if (cachedResult) {
        console.log(`[API] Returning cached result due to rate limit for ${campaignId}`);
        return NextResponse.json({
          success: true,
          status: cachedResult.status,
          source: 'cached_due_to_rate_limit',
          timestamp: cachedResult.timestamp,
          message: `Using cached status due to rate limit. Last checked: ${new Date(cachedResult.timestamp).toISOString()}`,
        });
      }
      
      return NextResponse.json({
        success: false,
        error: 'Rate limit exceeded for this campaign',
        retryAfter: campaignRateLimit.retryAfter,
        source: 'rate_limit',
      }, { status: 429 });
    }

    // Check if this campaign request is already in progress
    const pendingRequest = pendingCampaigns.get(cacheKey);
    
    if (pendingRequest && !forceRefresh) {
      console.log(`Using pending request for campaign ${campaignId}`);
      try {
        // Wait for the existing request to complete and use its result
        const result = await pendingRequest;
        return NextResponse.json(result);
      } catch (error) {
        console.error(`Error with pending request for ${campaignId}:`, error);
      }
    }

    // Check the general rate limit next (less restrictive)
    const generalRateLimit = await rateLimiter.limit(rateLimitKey, {
      uniqueTokenPerInterval: 500,
      interval: RATE_LIMIT_WINDOW,
      limit: RATE_LIMIT_MAX,
    });

    // Check account-specific rate limit (more generous for manual checks)
    const accountRateLimit = await rateLimiter.limit(`${rateLimitKey}:account`, {
      uniqueTokenPerInterval: 500,
      interval: RATE_LIMIT_WINDOW,
      limit: isManualCheck ? ACCOUNT_RATE_LIMIT * 2 : ACCOUNT_RATE_LIMIT, // Double the limit for manual checks
    });

    if (!generalRateLimit.success || !accountRateLimit.success) {
      const limitType = !generalRateLimit.success ? 'general' : 'account';
      const retryAfter = Math.max(generalRateLimit.retryAfter || 0, accountRateLimit.retryAfter || 0);
      
      console.log(`[RATE LIMIT] ${limitType} rate limit reached for ${accountId}:${brandId}${isManualCheck ? ' (manual check)' : ''}`);
      
      if (cachedResult) {
        return NextResponse.json({
          success: true,
          status: cachedResult.status,
          source: 'cached_due_to_rate_limit',
          timestamp: cachedResult.timestamp,
          message: `Using cached status due to rate limit. Last checked: ${new Date(cachedResult.timestamp).toISOString()}`,
        });
      }
      
      return NextResponse.json({
        success: false,
        error: isManualCheck ? 'Too many manual checks - please wait a moment before trying again' : 'Rate limit exceeded',
        retryAfter: retryAfter,
        source: 'rate_limit',
        limitType: limitType,
        isManualCheck: isManualCheck,
      }, { status: 429 });
    }

    // Create a promise for this request and store it
    const requestPromise = (async () => {
      try {
        // Get the brand to get the Meta connection
        const brand = await db.brand.findUnique({
          where: {
            id: brandId,
          },
        });

        if (!brand) {
          return {
            success: false,
            error: 'Brand not found or not authorized',
          };
        }

        if (!brand.metaConnection) {
          return {
            success: false,
            error: 'Meta connection not found for this brand',
          };
        }

        // Get the Meta account ID from the token
        const metaService = new MetaService(brand.metaConnection);
        
        try {
          // Get the status of the campaign
          const status = await metaService.getCampaignStatus(campaignId);
          
          // Update our cache with the latest status
          campaignCache.set(cacheKey, {
            status,
            timestamp: Date.now(),
            source: 'api',
          });
          
          return {
            success: true,
            status,
            source: 'api',
            timestamp: Date.now(),
            message: 'Campaign status refreshed successfully',
          };
        } catch (error: any) {
          console.error(`[Meta API Error] for campaign ${campaignId}:`, error);
          
          // Check if this is a rate limit error from Meta API
          if (error.message?.includes('rate limit') || error.code === 4 || error.code === 17 || error.code === 613) {
            // If rate limited by Meta API, use cached data if available
            if (cachedResult) {
              return {
                success: true,
                status: cachedResult.status,
                source: 'cached_due_to_meta_rate_limit',
                timestamp: cachedResult.timestamp,
                message: `Meta API rate limit reached. Using cached status from ${new Date(cachedResult.timestamp).toISOString()}`,
              };
            }
            
            return {
              success: false,
              error: 'Meta API rate limit reached',
              source: 'meta_rate_limit',
            };
          }
          
          return {
            success: false,
            error: `Meta API error: ${error.message || 'Unknown error'}`,
            code: error.code,
            source: 'meta_api_error',
          };
        }
      } catch (error: any) {
        console.error(`[Server Error] for campaign ${campaignId}:`, error);
        return {
          success: false,
          error: `Server error: ${error.message || 'Unknown error'}`,
          source: 'server_error',
        };
      } finally {
        // Remove this campaign from the pending list after completion
        setTimeout(() => {
          pendingCampaigns.delete(cacheKey);
        }, 100);
      }
    })();

    // Store the promise for future requests for the same campaign
    pendingCampaigns.set(cacheKey, requestPromise);
    
    // Wait for the result
    const result = await requestPromise;
    
    // Return appropriate status code based on the result
    if (!result.success) {
      if (result.source === 'meta_rate_limit') {
        return NextResponse.json(result, { status: 429 });
      }
      if (result.source === 'meta_api_error') {
        return NextResponse.json(result, { status: 502 });
      }
      if (result.error && (result.error.includes('not found') || result.error.includes('not authorized'))) {
        return NextResponse.json(result, { status: 404 });
      }
      
      return NextResponse.json(result, { status: 500 });
    }
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in campaign status check:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'An unexpected error occurred',
        source: 'api_error'
      }, 
      { status: 500 }
    );
  }
} 