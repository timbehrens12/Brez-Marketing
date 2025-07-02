import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { useAuth } from '@clerk/nextjs'
import { useRef, useCallback } from 'react'

/**
 * Hook to create a Supabase client with authentication from Clerk
 * This should be used in client components
 */
export function useAuthenticatedSupabase() {
  const { getToken } = useAuth()
  const clientRef = useRef<SupabaseClient | null>(null)
  const lastTokenRef = useRef<string | null>(null)
  const tokenExpiryRef = useRef<number | null>(null)
  const isCreatingRef = useRef<boolean>(false)
  
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
      
      // Check if current token is expired or expiring soon
      const needsRefresh = !tokenExpiryRef.current || 
                          isTokenExpiredOrExpiringSoon(tokenExpiryRef.current) ||
                          !clientRef.current
      
      if (needsRefresh) {
        console.log('🔄 Token expired or expiring soon, refreshing...')
        
        // Get fresh token
        const token = await getToken({ template: 'supabase' })
        
        if (token) {
          const expiry = getTokenExpiry(token)
          
          // Only create new client if token actually changed or client doesn't exist
          if (token !== lastTokenRef.current || !clientRef.current) {
            console.log('🔄 Creating new Supabase client with fresh token...')
            
            const client = createClient(supabaseUrl, supabaseKey, {
              global: {
                headers: {
                  Authorization: `Bearer ${token}`
                }
              }
            })
            
            // Store the client, token, and expiry for reuse
            clientRef.current = client
            lastTokenRef.current = token
            tokenExpiryRef.current = expiry
            
            console.log('✅ New Supabase client created with fresh token')
            return client
          } else {
            // Token is the same but we updated expiry
            tokenExpiryRef.current = expiry
            console.log('✅ Token refreshed but unchanged, reusing client')
            return clientRef.current
          }
        }
      } else {
        // Token is still valid, reuse existing client
        console.log('♻️ Reusing existing Supabase client (token still valid)')
        return clientRef.current!
      }
      
      // Fallback to existing client if available
      if (clientRef.current) {
        console.log('⚠️ No fresh token available, using existing client')
        return clientRef.current
      }
      
      // Last resort: create unauthenticated client
      console.log('⚠️ Creating unauthenticated Supabase client as fallback')
      clientRef.current = createClient(supabaseUrl, supabaseKey)
      lastTokenRef.current = null
      tokenExpiryRef.current = null
      return clientRef.current
      
    } catch (error) {
      console.error('❌ Error getting Supabase token:', error)
    
      // Fallback to existing client or create unauthenticated one
      if (!clientRef.current) {
        console.log('⚠️ Creating fallback unauthenticated client due to error')
        clientRef.current = createClient(supabaseUrl, supabaseKey)
        lastTokenRef.current = null
        tokenExpiryRef.current = null
      }
      return clientRef.current
    } finally {
      isCreatingRef.current = false
    }
  }, [getToken])
  
  return { getSupabaseClient }
} 