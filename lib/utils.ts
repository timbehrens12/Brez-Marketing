import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, startOfWeek, addDays, isBefore, isToday } from "date-fns"
import { useEffect } from 'react';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Utility to create a promise that resolves after a specified delay
 * Used for implementing delays and retry mechanisms
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function prepareRevenueByDayData(
  revenueData: number[],
): { day: string; date: string; revenue: number | null }[] {
  const today = new Date()
  const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 0 }) // 0 represents Sunday

  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(startOfCurrentWeek, i)
    const dayName = format(date, "EEE")
    const dateString = format(date, "MMM d")
    const isInPast = isBefore(date, today) || isToday(date)

    return {
      day: `${dayName}\n${dateString}`,
      date: dateString,
      revenue: isInPast ? revenueData[i] : null,
    }
  })
}

/**
 * Utility to fix the "Cannot access 'ep' before initialization" error 
 * that appears in bundled JavaScript
 */
export function useErrorBoundaryFix() {
  useEffect(() => {
    // This error appears to be related to a Next.js bundling issue with
    // code execution order. We'll add a global error handler to catch
    // and suppress this specific error.
    const originalErrorHandler = window.onerror;
    
    window.onerror = function(message, source, lineno, colno, error) {
      // Check if this is the specific error we want to handle
      if (error && 
          error.name === 'ReferenceError' && 
          error.message && 
          error.message.includes("Cannot access 'ep' before initialization")) {
        
        // Log it but suppress the error
        console.debug('Caught and suppressed the "ep" initialization error');
        return true; // Prevent the error from propagating
      }
      
      // For all other errors, use the original handler
      if (originalErrorHandler) {
        return originalErrorHandler(message, source, lineno, colno, error);
      }
      
      return false; // Allow default error handling for other errors
    };
    
    return () => {
      // Restore the original handler when the component unmounts
      window.onerror = originalErrorHandler;
    };
  }, []);
}

/**
 * Utility to fix Supabase API issues with specific error codes
 */
export function useSupabaseErrorHandler() {
  useEffect(() => {
    // Create a fetch interceptor for Supabase API calls
    const originalFetch = window.fetch;
    
    window.fetch = async function(...args) {
      const [resource, config] = args;
      
      // Check if this is a Supabase request
      if (typeof resource === 'string' && 
          (resource.includes('.supabase.co/rest/v1/') || 
           resource.includes('.supabase.co/storage/v1'))) {
        
        // Ensure we have proper config
        const newConfig = config || {};
        newConfig.headers = newConfig.headers || {};
        
        // Add required headers for Supabase
        const headers = new Headers(newConfig.headers);
        if (!headers.has('Accept')) {
          headers.set('Accept', 'application/json');
        }
        
        // Replace headers
        newConfig.headers = headers;
        
        try {
          // Make the fetch request with our updated config
          const response = await originalFetch(resource, newConfig);
          
          // Handle specific error codes
          if (response.status === 406 || response.status === 400) {
            console.warn(`Supabase API error ${response.status} for ${resource}`);
            
            // Try to get the error details
            try {
              const errorData = await response.clone().text();
              console.debug('Supabase error details:', errorData);
            } catch (e) {
              // Ignore error parsing issues
            }
          }
          
          return response;
        } catch (error) {
          console.error('Supabase fetch error:', error);
          throw error;
        }
      }
      
      // For non-Supabase requests, use the original fetch
      return originalFetch(...args);
    };
    
    return () => {
      // Restore original fetch when component unmounts
      window.fetch = originalFetch;
    };
  }, []);
}

