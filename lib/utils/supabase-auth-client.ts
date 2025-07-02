import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { useAuth } from '@clerk/nextjs'
import { useRef, useEffect, useCallback, useState } from 'react'

// Global singleton client instance
let globalClient: SupabaseClient | null = null
let globalToken: string | null = null
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

// Only initialize on client-side after DOM is ready to avoid hydration mismatches
if (typeof window !== 'undefined') {
  // Use setTimeout to ensure this runs after initial hydration
  setTimeout(() => {
    initializeBasicClient()
  }, 0)
}

/**
 * Hook to create a Supabase client with authentication from Clerk
 * This should be used in client components
 */
export function useAuthenticatedSupabase() {
  const { getToken } = useAuth()
  const [isReady, setIsReady] = useState(false)
  
  // Function to decode JWT and get expiry time
  const getTokenExpiry = (token: string): number | null => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      return payload.exp ? payload.exp * 1000 : null // Convert to milliseconds
    } catch {
      return null
    }
  }
  
  // Function to check if token is expired or will expire soon (within 1 minute)
  const isTokenExpiredOrExpiringSoon = (expiry: number | null): boolean => {
    if (!expiry) return true
    const oneMinuteFromNow = Date.now() + (1 * 60 * 1000)
    return expiry < oneMinuteFromNow
    }
    
  // Upgrade to authenticated client
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
      
      // Only upgrade if we got a token and it's different
      if (token && token !== globalToken) {
        console.log('🔄 Upgrading to authenticated Supabase client (singleton)')
        globalClient = createClient(supabaseUrl, supabaseKey, {
          global: {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        })
        globalToken = token
        console.log('✅ Singleton upgraded to authenticated client')
        
        // Expose globally for other systems
        exposeGlobalClient()
      } else if (!token) {
        console.log('⚠️ No token available, keeping basic client')
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
  
  // Refresh token if needed
  const refreshTokenIfNeeded = async (): Promise<void> => {
    if (!globalToken) return
    
    const expiry = getTokenExpiry(globalToken)
    if (isTokenExpiredOrExpiringSoon(expiry)) {
      console.log('🔄 Token expiring soon, upgrading client...')
      await upgradeToAuthenticatedClient()
    }
      }
      
  // Initialize on mount
  useEffect(() => {
    let isMounted = true
    
    const initialize = async () => {
      try {
        // Ensure basic client exists first
        if (!globalClient) {
          initializeBasicClient()
        }
        
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
      // Refresh token if needed
      await refreshTokenIfNeeded()
      
      // Ensure we have a client (should always be true now)
      if (!globalClient) {
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