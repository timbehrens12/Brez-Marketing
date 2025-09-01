/**
 * Utility for making fetch requests with retry capability
 */

type RetryOptions = {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  retryStatusCodes?: number[];
  onRetry?: (attempt: number, delay: number) => void;
};

/**
 * Fetch with automatic retry for specific status codes
 */
export async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  retryOptions?: RetryOptions
): Promise<Response> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    retryStatusCodes = [408, 429, 500, 502, 503, 504],
    onRetry = () => {},
  } = retryOptions || {};

  let attempt = 0;
  let delay = initialDelay;

  while (attempt <= maxRetries) {
    try {
      const response = await fetch(url, options);
      
      if (response.ok || !retryStatusCodes.includes(response.status) || attempt >= maxRetries) {
        return response;
      }

      // Get retry-after header if available
      const retryAfter = response.headers.get('Retry-After');
      if (retryAfter) {
        // Retry-After can be a date or seconds
        const parsedRetryAfter = isNaN(Number(retryAfter)) 
          ? new Date(retryAfter).getTime() - Date.now() 
          : Number(retryAfter) * 1000;
          
        if (!isNaN(parsedRetryAfter) && parsedRetryAfter > 0) {
          delay = Math.min(parsedRetryAfter, maxDelay);
        }
      }

      // Calculate exponential backoff if no Retry-After header
      if (!retryAfter) {
        delay = Math.min(delay * 2, maxDelay);
      }

      attempt++;
      onRetry(attempt, delay);
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delay));
    } catch (error) {
      if (attempt >= maxRetries) {
        throw error;
      }
      
      attempt++;
      onRetry(attempt, delay);
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.min(delay * 2, maxDelay);
    }
  }

  // This should not be reached but TypeScript requires a return
  throw new Error('Maximum retry attempts reached');
} 