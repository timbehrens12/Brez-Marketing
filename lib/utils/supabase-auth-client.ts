import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { useAuth } from '@clerk/nextjs'
import { useRef, useCallback, useEffect } from 'react'

/**
 * Hook to create a Supabase client with authentication from Clerk
 * This should be used in client components
 */
export function useAuthenticatedSupabase() {
  const { getToken } = useAuth()
  const clientRef = useRef<SupabaseClient | null>(null)
  const lastTokenRef = useRef<string | null>(null)
  const tokenTimestampRef = useRef<number>(0)
  const isCreatingRef = useRef<boolean>(false)
  
  // Function to force token refresh
  const forceTokenRefresh = useCallback(async () => {
    console.log('🔄 Forcing token refresh...')
    lastTokenRef.current = null
    clientRef.current = null
    tokenTimestampRef.current = 0
    return await getSupabaseClient()
  }, [])
  
  // Function to create a Supabase client with the Clerk token
  const getSupabaseClient = useCallback(async () => {
    // Prevent concurrent client creation
    if (isCreatingRef.current) {
      // Wait for ongoing creation to complete
      while (isCreatingRef.current) {
        await new Promise(resolve => setTimeout(resolve, 10))
      }
      if (clientRef.current) return clientRef.current
    }
    
    // Get the Supabase URL and key from environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    
    try {
      isCreatingRef.current = true
      
      // Check if token is stale (older than 5 minutes)
      const now = Date.now()
      const tokenAge = now - tokenTimestampRef.current
      const isTokenStale = tokenAge > 5 * 60 * 1000 // 5 minutes
      
      if (isTokenStale && lastTokenRef.current) {
        console.log('🕒 Token is stale, forcing refresh...')
        lastTokenRef.current = null
        clientRef.current = null
      }
      
      // Get fresh token
      const token = await getToken({ template: 'supabase' })
      
      // If we have the same token and a working client, reuse it
      if (token && token === lastTokenRef.current && clientRef.current && !isTokenStale) {
        return clientRef.current
      }
      
      // Create new client only when absolutely necessary
      if (token && (!clientRef.current || token !== lastTokenRef.current)) {
        console.log('🔄 Creating new Supabase client instance...')
        const client = createClient(supabaseUrl, supabaseKey, {
          global: {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        })
        
        // Store the client and token for reuse
        clientRef.current = client
        lastTokenRef.current = token
        tokenTimestampRef.current = now
        console.log('✅ Supabase client instance created successfully')
        return client
      }
      
      // Fallback to existing client if available
      if (clientRef.current) {
        return clientRef.current
      }
      
      // Last resort: create unauthenticated client
      clientRef.current = createClient(supabaseUrl, supabaseKey)
      lastTokenRef.current = null
      tokenTimestampRef.current = 0
      return clientRef.current
      
    } catch (error) {
      console.error('Error getting Supabase token:', error)
    
      // Fallback to existing client or create unauthenticated one
      if (!clientRef.current) {
        clientRef.current = createClient(supabaseUrl, supabaseKey)
        lastTokenRef.current = null
        tokenTimestampRef.current = 0
      }
      return clientRef.current
    } finally {
      isCreatingRef.current = false
    }
  }, [getToken])

  // Listen for page visibility changes to refresh token
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Check if we've been away for more than 2 minutes
        const now = Date.now()
        const timeSinceLastToken = now - tokenTimestampRef.current
        if (timeSinceLastToken > 2 * 60 * 1000 && lastTokenRef.current) {
          console.log('👀 Page became visible after extended absence, refreshing token...')
          forceTokenRefresh()
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [forceTokenRefresh])
  
  return { getSupabaseClient, forceTokenRefresh }
} 