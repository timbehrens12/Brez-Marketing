import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { useAuth } from '@clerk/nextjs'
import { useRef, useEffect, useCallback, useState } from 'react'

// Global singleton client instance
let globalClient: SupabaseClient | null = null
let globalToken: string | null = null
let tokenExpiry: number | null = null
let isInitializing = false

// Export getter for direct access by other modules
export const getGlobalClient = () => globalClient

// Expose global client for other systems to access
function exposeGlobalClient() {
  if (typeof window !== 'undefined') {
    (window as any).__supabase_global_client = globalClient
    console.log('🌐 Global Supabase client exposed for cross-system access')
  }
}

// Initialize basic client immediately if on client-side (after function definitions)
function initializeBasicClient() {
  if (typeof window !== 'undefined' && !globalClient) {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      
      console.log('🚀 Pre-initializing global Supabase client (basic)')
      globalClient = createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        }
      })
      exposeGlobalClient()
    } catch (error) {
      console.error('❌ Failed to pre-initialize Supabase client:', error)
    }
  }
}

// Call initialization
initializeBasicClient()

/**
 * Hook to create a Supabase client with authentication from Clerk
 * This should be used in client components
 */
export function useAuthenticatedSupabase() {
  const { getToken } = useAuth()
  const [isReady, setIsReady] = useState(false)
  const initializeRef = useRef(false)
  
  // Function to decode JWT and get expiry time
  const getTokenExpiry = (token: string): number | null => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      return payload.exp ? payload.exp * 1000 : null // Convert to milliseconds
    } catch {
      return null
    }
  }
  
  // Function to check if token is expired or will expire soon (within 30 seconds)
  const isTokenExpiredOrExpiringSoon = (expiry: number | null): boolean => {
    if (!expiry) return true
    const thirtySecondsFromNow = Date.now() + (30 * 1000) // Changed from 1 minute to 30 seconds
    return expiry < thirtySecondsFromNow
  }
  
  // Upgrade to authenticated client - only when token actually changes
  const upgradeToAuthenticatedClient = async (): Promise<SupabaseClient> => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    
    // Prevent concurrent upgrades
    if (isInitializing) {
      while (isInitializing) {
        await new Promise(resolve => setTimeout(resolve, 50))
      }
      if (globalClient) return globalClient
    }
    
    try {
      isInitializing = true
      
      const token = await getToken({ template: 'supabase' })
      
      // Only upgrade if we got a new token
      if (token && token !== globalToken) {
        console.log('🔄 Upgrading to authenticated Supabase client (new token detected)')
        
        // Create new authenticated client
        globalClient = createClient(supabaseUrl, supabaseKey, {
          global: {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        })
        
        // Update global state
        globalToken = token
        tokenExpiry = getTokenExpiry(token)
        
        console.log('✅ Singleton upgraded to authenticated client')
        exposeGlobalClient()
      } else if (!token) {
        console.log('⚠️ No token available, keeping existing client')
      } else {
        console.log('♻️ Token unchanged, keeping existing client')
      }
      
      return globalClient!
    } catch (error) {
      console.error('❌ Error upgrading Supabase client:', error)
      return globalClient!
    } finally {
      isInitializing = false
    }
  }
  
  // Check if we need to refresh the token (more conservative)
  const needsTokenRefresh = (): boolean => {
    if (!globalToken || !tokenExpiry) return true
    return isTokenExpiredOrExpiringSoon(tokenExpiry)
  }
  
  // Initialize only once per component mount
  useEffect(() => {
    if (initializeRef.current) return
    initializeRef.current = true
    
    let isMounted = true
    
    const initialize = async () => {
      try {
        await upgradeToAuthenticatedClient()
        if (isMounted) {
          setIsReady(true)
        }
      } catch (error) {
        console.error('❌ Failed to upgrade Supabase client:', error)
        if (isMounted) {
          setIsReady(true) // Set ready even on error so app doesn't hang
        }
      }
    }
    
    initialize()
    
    return () => {
      isMounted = false
    }
  }, [])
  
  // Main function to get the client
  const getSupabaseClient = useCallback(async (): Promise<SupabaseClient | null> => {
    try {
      // Only refresh if token is actually expiring soon
      if (needsTokenRefresh()) {
        console.log('🔄 Token refresh needed, upgrading client...')
        await upgradeToAuthenticatedClient()
      }
      
      // Ensure we have a client (should always be true now)
      if (!globalClient) {
        console.log('⚠️ No global client found, creating one...')
        await upgradeToAuthenticatedClient()
      }
      
      return globalClient
    } catch (error) {
      console.error('❌ Error getting Supabase client:', error)
      return globalClient
    }
  }, [])
  
  return { getSupabaseClient, isReady }
} 