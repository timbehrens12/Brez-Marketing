import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { useAuth } from '@clerk/nextjs'
import { useRef, useEffect, useCallback, useState } from 'react'

/**
 * Hook to create a Supabase client with authentication from Clerk
 * This should be used in client components
 */
export function useAuthenticatedSupabase() {
  const { getToken } = useAuth()
  const clientRef = useRef<SupabaseClient | null>(null)
  const lastTokenRef = useRef<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  
  // Initialize client only once on mount to prevent hydration issues
  useEffect(() => {
    if (!isInitialized) {
      console.log('🔄 Initializing Supabase client...')
      initializeClient()
      setIsInitialized(true)
    }
  }, [isInitialized])
  
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
  
  // Initialize client with fresh token
  const initializeClient = async () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    
    try {
      const token = await getToken({ template: 'supabase' })
      
      if (token) {
        console.log('✅ Creating authenticated Supabase client')
        clientRef.current = createClient(supabaseUrl, supabaseKey, {
          global: {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        })
        lastTokenRef.current = token
      } else {
        console.log('⚠️ No token available, creating unauthenticated client')
        clientRef.current = createClient(supabaseUrl, supabaseKey)
        lastTokenRef.current = null
      }
    } catch (error) {
      console.error('❌ Error initializing Supabase client:', error)
      clientRef.current = createClient(supabaseUrl, supabaseKey)
      lastTokenRef.current = null
    }
  }
  
  // Function to refresh the client with a new token
  const refreshClient = async () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    
    try {
      console.log('🔄 Refreshing Supabase client token...')
      const token = await getToken({ template: 'supabase' })
      
      if (token && token !== lastTokenRef.current) {
        console.log('✅ Creating new client with fresh token')
        clientRef.current = createClient(supabaseUrl, supabaseKey, {
          global: {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        })
        lastTokenRef.current = token
      } else if (token) {
        console.log('♻️ Token unchanged, keeping existing client')
      } else {
        console.log('⚠️ No token available for refresh')
      }
    } catch (error) {
      console.error('❌ Error refreshing Supabase client:', error)
    }
  }
  
  // Function to get the current client, with optional refresh
  const getSupabaseClient = useCallback(async (): Promise<SupabaseClient | null> => {
    // If not initialized yet, wait briefly and try again
    if (!isInitialized || !clientRef.current) {
      console.log('⏳ Client not ready yet, initializing...')
      await initializeClient()
      setIsInitialized(true)
      return clientRef.current
    }
    
    // Check if we need to refresh the token
    if (lastTokenRef.current) {
      const expiry = getTokenExpiry(lastTokenRef.current)
      if (isTokenExpiredOrExpiringSoon(expiry)) {
        await refreshClient()
      }
    }
    
    return clientRef.current
  }, [isInitialized])
  
  return { getSupabaseClient, isInitialized }
} 