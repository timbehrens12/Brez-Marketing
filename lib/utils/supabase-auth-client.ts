import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { useAuth } from '@clerk/nextjs'
import { useRef, useEffect, useCallback, useState } from 'react'

// Global singleton client instance
let globalClient: SupabaseClient | null = null
let globalToken: string | null = null
let isInitializing = false

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
  
  // Function to check if token is expired or will expire soon (within 5 minutes)
  const isTokenExpiredOrExpiringSoon = (expiry: number | null): boolean => {
    if (!expiry) return true
    const fiveMinutesFromNow = Date.now() + (5 * 60 * 1000)
    return expiry < fiveMinutesFromNow
  }
  
  // Create or get the singleton client
  const createSingletonClient = async (): Promise<SupabaseClient> => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    
    // Prevent concurrent initialization
    if (isInitializing) {
      // Wait for ongoing initialization
      while (isInitializing) {
        await new Promise(resolve => setTimeout(resolve, 50))
      }
      if (globalClient) return globalClient
    }
    
    try {
      isInitializing = true
      
      const token = await getToken({ template: 'supabase' })
      
      // Only create new client if token changed or no client exists
      if (!globalClient || token !== globalToken) {
        if (token) {
          console.log('🔄 Creating new authenticated Supabase client (singleton)')
          globalClient = createClient(supabaseUrl, supabaseKey, {
            global: {
              headers: {
                Authorization: `Bearer ${token}`
              }
            }
          })
          globalToken = token
          console.log('✅ Singleton Supabase client created successfully')
        } else {
          console.log('⚠️ No token available, creating unauthenticated singleton client')
          globalClient = createClient(supabaseUrl, supabaseKey)
          globalToken = null
        }
      } else {
        console.log('♻️ Reusing existing singleton Supabase client')
      }
      
      return globalClient
    } catch (error) {
      console.error('❌ Error creating singleton Supabase client:', error)
      if (!globalClient) {
        globalClient = createClient(supabaseUrl, supabaseKey)
        globalToken = null
      }
      return globalClient
    } finally {
      isInitializing = false
    }
  }
  
  // Refresh token if needed
  const refreshTokenIfNeeded = async (): Promise<void> => {
    if (!globalToken) return
    
    const expiry = getTokenExpiry(globalToken)
    if (isTokenExpiredOrExpiringSoon(expiry)) {
      console.log('🔄 Token expiring soon, forcing refresh...')
      await createSingletonClient()
    }
  }
  
  // Initialize on mount
  useEffect(() => {
    let isMounted = true
    
    const initialize = async () => {
      try {
        await createSingletonClient()
        if (isMounted) {
          setIsReady(true)
        }
      } catch (error) {
        console.error('❌ Failed to initialize Supabase client:', error)
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
      
      // Ensure we have a client
      if (!globalClient) {
        await createSingletonClient()
      }
      
      return globalClient
    } catch (error) {
      console.error('❌ Error getting Supabase client:', error)
      return globalClient
    }
  }, [])
  
  return { getSupabaseClient, isReady }
} 