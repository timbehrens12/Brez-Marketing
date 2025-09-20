// Meta API Rate Limiter
// Prevents "User request limit reached" (code 17, subcode 2446079) errors

interface QueuedRequest {
  id: string;
  accountId: string;
  request: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  retryCount: number;
  priority: number; // Higher = more priority
}

interface RateLimitState {
  lastRequestTime: number;
  requestCount: number;
  isRateLimited: boolean;
  rateLimitResetTime: number;
}

class MetaRateLimiter {
  private queue: QueuedRequest[] = [];
  private processing = false;
  private accountStates = new Map<string, RateLimitState>();
  
  // Rate limit settings per ad account
  private readonly MAX_REQUESTS_PER_HOUR = 200; // Conservative limit
  private readonly MIN_REQUEST_INTERVAL = 500; // 500ms between requests (slower)
  private readonly RATE_LIMIT_RESET_TIME = 5 * 60 * 1000; // 5 minutes (much more reasonable)
  
  /**
   * Add a Meta API request to the queue
   */
  async executeRequest<T>(
    accountId: string,
    request: () => Promise<T>,
    priority: number = 0,
    requestId?: string,
    timeoutMs: number = 10000 // 10 second timeout by default
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const queuedRequest: QueuedRequest = {
        id: requestId || `${accountId}-${Date.now()}-${Math.random()}`,
        accountId,
        request,
        resolve,
        reject,
        retryCount: 0,
        priority
      };
      
      // Set a timeout to prevent hanging requests
      const timeoutId = setTimeout(() => {
        // Remove from queue if still waiting
        const index = this.queue.findIndex(req => req.id === queuedRequest.id);
        if (index !== -1) {
          this.queue.splice(index, 1);
          reject(new Error(`Request ${queuedRequest.id} timed out after ${timeoutMs}ms`));
        }
      }, timeoutMs);
      
      // Wrap resolve and reject to clear timeout
      const originalResolve = queuedRequest.resolve;
      const originalReject = queuedRequest.reject;
      
      queuedRequest.resolve = (value: any) => {
        clearTimeout(timeoutId);
        originalResolve(value);
      };
      
      queuedRequest.reject = (error: any) => {
        clearTimeout(timeoutId);
        originalReject(error);
      };
      
      // Insert into queue based on priority
      const insertIndex = this.queue.findIndex(item => item.priority < priority);
      if (insertIndex === -1) {
        this.queue.push(queuedRequest);
      } else {
        this.queue.splice(insertIndex, 0, queuedRequest);
      }
      
      console.log(`[MetaRateLimiter] Queued request ${queuedRequest.id} for account ${accountId} (priority: ${priority})`);
      
      this.processQueue();
    });
  }
  
  /**
   * Process the request queue
   */
  private async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }
    
    this.processing = true;
    
    while (this.queue.length > 0) {
      const request = this.queue.shift()!;
      
      try {
        // Check if account is rate limited
        if (this.isAccountRateLimited(request.accountId)) {
          const state = this.accountStates.get(request.accountId)!;
          const waitTime = state.rateLimitResetTime - Date.now();
          
          if (waitTime > 0) {
            console.log(`[MetaRateLimiter] Account ${request.accountId} is rate limited, failing fast instead of waiting ${Math.round(waitTime / 1000)}s`);
            
            // Fail fast when rate limited - let the caller use database fallback
            request.reject(new Error(`Account ${request.accountId} is rate limited. Wait ${Math.round(waitTime / 1000)}s before retrying.`));
            continue;
          } else {
            // Reset rate limit state
            this.resetAccountState(request.accountId);
          }
        }
        
        // Wait for minimum interval
        await this.ensureMinInterval(request.accountId);
        
        // Execute the request
        console.log(`[MetaRateLimiter] Executing request ${request.id} for account ${request.accountId}`);
        const result = await request.request();
        
        // Update rate limit tracking
        this.updateAccountState(request.accountId);
        
        request.resolve(result);
        
      } catch (error: any) {
        console.error(`[MetaRateLimiter] Request ${request.id} failed:`, error);
        
        // Check if it's a rate limit error
        if (this.isRateLimitError(error)) {
          console.log(`[MetaRateLimiter] Rate limit detected for account ${request.accountId}`);
          this.markAccountRateLimited(request.accountId);
          
          // Retry with exponential backoff
          if (request.retryCount < 3) {
            request.retryCount++;
            const delay = Math.pow(2, request.retryCount) * 1000; // 2s, 4s, 8s
            
            console.log(`[MetaRateLimiter] Retrying request ${request.id} in ${delay}ms (attempt ${request.retryCount + 1})`);
            
            setTimeout(() => {
              this.queue.unshift(request); // Put back at front of queue
              this.processQueue();
            }, delay);
            
            continue; // Don't resolve/reject yet
          }
        }
        
        request.reject(error);
      }
    }
    
    this.processing = false;
  }
  
  /**
   * Check if error is a rate limit error
   */
  private isRateLimitError(error: any): boolean {
    if (error?.error?.code === 17 && error?.error?.error_subcode === 2446079) {
      return true; // "User request limit reached"
    }
    if (error?.error?.code === 80004) {
      return true; // "There have been too many calls to this account"
    }
    if (error?.message?.includes('rate limit') || error?.message?.includes('too many calls')) {
      return true;
    }
    return false;
  }
  
  /**
   * Check if account is currently rate limited
   */
  private isAccountRateLimited(accountId: string): boolean {
    const state = this.accountStates.get(accountId);
    if (!state) return false;
    
    return state.isRateLimited && Date.now() < state.rateLimitResetTime;
  }
  
  /**
   * Mark account as rate limited
   */
  private markAccountRateLimited(accountId: string) {
    const state = this.accountStates.get(accountId) || this.createAccountState();
    state.isRateLimited = true;
    state.rateLimitResetTime = Date.now() + this.RATE_LIMIT_RESET_TIME;
    this.accountStates.set(accountId, state);
  }
  
  /**
   * Reset account rate limit state
   */
  private resetAccountState(accountId: string) {
    const state = this.createAccountState();
    this.accountStates.set(accountId, state);
  }
  
  /**
   * Update account state after successful request
   */
  private updateAccountState(accountId: string) {
    const now = Date.now();
    const state = this.accountStates.get(accountId) || this.createAccountState();
    
    // Reset hourly counter if more than an hour has passed
    if (now - state.lastRequestTime > this.RATE_LIMIT_RESET_TIME) {
      state.requestCount = 0;
    }
    
    state.lastRequestTime = now;
    state.requestCount++;
    state.isRateLimited = false;
    
    this.accountStates.set(accountId, state);
  }
  
  /**
   * Ensure minimum interval between requests
   */
  private async ensureMinInterval(accountId: string) {
    const state = this.accountStates.get(accountId);
    if (!state) return;
    
    const timeSinceLastRequest = Date.now() - state.lastRequestTime;
    if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
      const waitTime = this.MIN_REQUEST_INTERVAL - timeSinceLastRequest;
      await this.delay(waitTime);
    }
  }
  
  /**
   * Create initial account state
   */
  private createAccountState(): RateLimitState {
    return {
      lastRequestTime: 0,
      requestCount: 0,
      isRateLimited: false,
      rateLimitResetTime: 0
    };
  }
  
  /**
   * Simple delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Get queue status for debugging
   */
  getQueueStatus() {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      accountStates: Array.from(this.accountStates.entries()).map(([accountId, state]) => ({
        accountId,
        isRateLimited: state.isRateLimited,
        requestCount: state.requestCount,
        rateLimitResetTime: state.rateLimitResetTime
      }))
    };
  }
}

// Export singleton instance
export const metaRateLimiter = new MetaRateLimiter();

// Helper function to wrap Meta API calls
export async function withMetaRateLimit<T>(
  accountId: string,
  request: () => Promise<T>,
  priority: number = 0,
  requestId?: string,
  timeoutMs: number = 10000 // 10 second default timeout
): Promise<T> {
  return metaRateLimiter.executeRequest(accountId, request, priority, requestId, timeoutMs);
}
