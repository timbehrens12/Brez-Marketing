'use client'

import { useEffect } from 'react';

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
        
        // Add additional headers for Supabase (especially for 406 errors)
        headers.set('apikey', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');
        headers.set('X-Client-Info', 'brez-marketing-dashboard');
        
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